#!/usr/bin/env python3
"""
Traffic Shifter Lambda Function for Canary Deployments
Automatically shifts traffic between production and canary versions
with health checks and automated rollback capabilities.
"""

import json
import os
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

import boto3
from botocore.exceptions import ClientError

# Initialize AWS clients
elbv2_client = boto3.client('elbv2')
cloudwatch_client = boto3.client('cloudwatch')
sns_client = boto3.client('sns')
dynamodb_client = boto3.client('dynamodb')

# Environment variables
LISTENER_ARN = os.environ['LISTENER_ARN']
PRODUCTION_TG_ARN = os.environ['PRODUCTION_TG_ARN']
CANARY_TG_ARN = os.environ['CANARY_TG_ARN']
CANARY_STAGES = json.loads(os.environ['CANARY_STAGES'])
STAGE_DURATION_MINUTES = int(os.environ['STAGE_DURATION_MINUTES'])
ALARM_NAMES = json.loads(os.environ['ALARM_NAMES'])
SNS_TOPIC_ARN = os.environ['SNS_TOPIC_ARN']
AUTO_ROLLBACK_ENABLED = os.environ.get('AUTO_ROLLBACK_ENABLED', 'true').lower() == 'true'


class CanaryDeploymentError(Exception):
    """Custom exception for canary deployment errors"""
    pass


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for progressive traffic shifting

    Args:
        event: Lambda event data (can contain deployment_id or action)
        context: Lambda context

    Returns:
        Response with deployment status
    """
    try:
        print(f"Event received: {json.dumps(event)}")

        # Determine action
        action = event.get('action', 'progress')
        deployment_id = event.get('deployment_id', f"deployment-{int(time.time())}")

        if action == 'start':
            return start_canary_deployment(deployment_id, event)
        elif action == 'progress':
            return progress_canary_deployment(deployment_id)
        elif action == 'complete':
            return complete_canary_deployment(deployment_id)
        elif action == 'rollback':
            return rollback_canary_deployment(deployment_id)
        else:
            raise ValueError(f"Unknown action: {action}")

    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        send_notification(
            subject="Canary Deployment Error",
            message=f"Error during canary deployment: {str(e)}"
        )
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def start_canary_deployment(deployment_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Start a new canary deployment

    Args:
        deployment_id: Unique deployment identifier
        event: Event data with deployment configuration

    Returns:
        Response with deployment start status
    """
    print(f"Starting canary deployment: {deployment_id}")

    # Get current traffic distribution
    current_config = get_listener_rules()

    # Initialize deployment state
    state = {
        'deployment_id': deployment_id,
        'status': 'in_progress',
        'current_stage': 0,
        'stages': CANARY_STAGES,
        'start_time': int(time.time()),
        'last_update': int(time.time()),
        'previous_config': current_config,
        'canary_version': event.get('canary_version', 'unknown'),
        'production_version': event.get('production_version', 'unknown')
    }

    # Save initial state
    save_deployment_state(state)

    # Start with first stage
    success = shift_traffic(CANARY_STAGES[0], deployment_id)

    if success:
        send_notification(
            subject=f"Canary Deployment Started: {deployment_id}",
            message=f"Canary deployment has started.\n"
                   f"Deployment ID: {deployment_id}\n"
                   f"Initial traffic: {CANARY_STAGES[0]}% to canary\n"
                   f"Canary version: {state['canary_version']}\n"
                   f"Production version: {state['production_version']}"
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'started',
                'deployment_id': deployment_id,
                'current_stage': 0,
                'canary_traffic_percent': CANARY_STAGES[0]
            })
        }
    else:
        state['status'] = 'failed'
        save_deployment_state(state)
        raise CanaryDeploymentError("Failed to start canary deployment")


def progress_canary_deployment(deployment_id: str) -> Dict[str, Any]:
    """
    Progress canary deployment to next stage if health checks pass

    Args:
        deployment_id: Unique deployment identifier

    Returns:
        Response with progression status
    """
    print(f"Progressing canary deployment: {deployment_id}")

    # Get current deployment state
    state = get_latest_deployment_state()

    if not state or state['status'] != 'in_progress':
        print("No active deployment found")
        return {
            'statusCode': 200,
            'body': json.dumps({'status': 'no_active_deployment'})
        }

    # Check if enough time has passed
    current_time = int(time.time())
    time_since_last_update = (current_time - state['last_update']) / 60  # minutes

    if time_since_last_update < STAGE_DURATION_MINUTES:
        print(f"Not enough time passed. {time_since_last_update:.1f}/{STAGE_DURATION_MINUTES} minutes")
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'waiting',
                'minutes_remaining': STAGE_DURATION_MINUTES - time_since_last_update
            })
        }

    # Check health of canary
    health_status = check_canary_health()

    if not health_status['healthy']:
        print(f"Canary unhealthy: {health_status['reason']}")

        if AUTO_ROLLBACK_ENABLED:
            return rollback_canary_deployment(deployment_id, health_status['reason'])
        else:
            send_notification(
                subject=f"Canary Deployment Unhealthy: {deployment_id}",
                message=f"Canary deployment is unhealthy but auto-rollback is disabled.\n"
                       f"Reason: {health_status['reason']}\n"
                       f"Manual intervention required."
            )
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'unhealthy',
                    'reason': health_status['reason'],
                    'auto_rollback': False
                })
            }

    # Progress to next stage
    current_stage = state['current_stage']
    next_stage = current_stage + 1

    if next_stage >= len(CANARY_STAGES):
        # Deployment complete
        return complete_canary_deployment(deployment_id)

    # Shift traffic to next stage
    next_percentage = CANARY_STAGES[next_stage]
    success = shift_traffic(next_percentage, deployment_id)

    if success:
        state['current_stage'] = next_stage
        state['last_update'] = current_time
        save_deployment_state(state)

        send_notification(
            subject=f"Canary Deployment Progressed: Stage {next_stage + 1}/{len(CANARY_STAGES)}",
            message=f"Canary deployment progressed to next stage.\n"
                   f"Deployment ID: {deployment_id}\n"
                   f"Stage: {next_stage + 1}/{len(CANARY_STAGES)}\n"
                   f"Canary traffic: {next_percentage}%"
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'progressed',
                'current_stage': next_stage,
                'canary_traffic_percent': next_percentage
            })
        }
    else:
        raise CanaryDeploymentError(f"Failed to progress to stage {next_stage}")


def complete_canary_deployment(deployment_id: str) -> Dict[str, Any]:
    """
    Complete canary deployment - 100% traffic to canary

    Args:
        deployment_id: Unique deployment identifier

    Returns:
        Response with completion status
    """
    print(f"Completing canary deployment: {deployment_id}")

    state = get_latest_deployment_state()

    if not state:
        raise CanaryDeploymentError("No deployment state found")

    # Final health check
    health_status = check_canary_health()

    if not health_status['healthy']:
        if AUTO_ROLLBACK_ENABLED:
            return rollback_canary_deployment(deployment_id, health_status['reason'])
        else:
            raise CanaryDeploymentError(f"Canary unhealthy: {health_status['reason']}")

    # Shift 100% traffic to canary
    success = shift_traffic(100, deployment_id)

    if success:
        state['status'] = 'completed'
        state['completion_time'] = int(time.time())
        save_deployment_state(state)

        duration_minutes = (state['completion_time'] - state['start_time']) / 60

        send_notification(
            subject=f"Canary Deployment Completed: {deployment_id}",
            message=f"Canary deployment completed successfully!\n"
                   f"Deployment ID: {deployment_id}\n"
                   f"Duration: {duration_minutes:.1f} minutes\n"
                   f"All traffic now routing to canary version."
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'completed',
                'deployment_id': deployment_id,
                'duration_minutes': duration_minutes
            })
        }
    else:
        raise CanaryDeploymentError("Failed to complete canary deployment")


def rollback_canary_deployment(deployment_id: str, reason: str = "Manual rollback") -> Dict[str, Any]:
    """
    Rollback canary deployment to previous configuration

    Args:
        deployment_id: Unique deployment identifier
        reason: Reason for rollback

    Returns:
        Response with rollback status
    """
    print(f"Rolling back canary deployment: {deployment_id}. Reason: {reason}")

    state = get_latest_deployment_state()

    if not state:
        raise CanaryDeploymentError("No deployment state found")

    # Restore previous configuration (100% production)
    success = shift_traffic(0, deployment_id)  # 0% canary = 100% production

    if success:
        state['status'] = 'rolled_back'
        state['rollback_time'] = int(time.time())
        state['rollback_reason'] = reason
        save_deployment_state(state)

        send_notification(
            subject=f"Canary Deployment Rolled Back: {deployment_id}",
            message=f"Canary deployment has been rolled back.\n"
                   f"Deployment ID: {deployment_id}\n"
                   f"Reason: {reason}\n"
                   f"All traffic restored to production version."
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'rolled_back',
                'deployment_id': deployment_id,
                'reason': reason
            })
        }
    else:
        raise CanaryDeploymentError("Failed to rollback canary deployment")


def shift_traffic(canary_percentage: int, deployment_id: str) -> bool:
    """
    Shift traffic between production and canary target groups

    Args:
        canary_percentage: Percentage of traffic to send to canary (0-100)
        deployment_id: Deployment identifier

    Returns:
        True if successful, False otherwise
    """
    try:
        production_percentage = 100 - canary_percentage

        print(f"Shifting traffic: {canary_percentage}% canary, {production_percentage}% production")

        # Modify listener to use weighted target groups
        response = elbv2_client.modify_listener(
            ListenerArn=LISTENER_ARN,
            DefaultActions=[
                {
                    'Type': 'forward',
                    'ForwardConfig': {
                        'TargetGroups': [
                            {
                                'TargetGroupArn': CANARY_TG_ARN,
                                'Weight': canary_percentage
                            },
                            {
                                'TargetGroupArn': PRODUCTION_TG_ARN,
                                'Weight': production_percentage
                            }
                        ],
                        'TargetGroupStickinessConfig': {
                            'Enabled': True,
                            'DurationSeconds': 300
                        }
                    }
                }
            ]
        )

        print(f"Traffic shift successful: {response}")
        return True

    except ClientError as e:
        print(f"Error shifting traffic: {str(e)}")
        return False


def check_canary_health() -> Dict[str, Any]:
    """
    Check health of canary deployment using CloudWatch alarms

    Returns:
        Dictionary with health status and reason
    """
    try:
        response = cloudwatch_client.describe_alarms(AlarmNames=ALARM_NAMES)

        unhealthy_alarms = []

        for alarm in response['MetricAlarms']:
            if alarm['StateValue'] == 'ALARM':
                unhealthy_alarms.append({
                    'name': alarm['AlarmName'],
                    'reason': alarm.get('StateReason', 'Unknown')
                })

        if unhealthy_alarms:
            reasons = [f"{a['name']}: {a['reason']}" for a in unhealthy_alarms]
            return {
                'healthy': False,
                'reason': '; '.join(reasons),
                'alarms': unhealthy_alarms
            }

        return {'healthy': True, 'reason': 'All alarms OK'}

    except ClientError as e:
        print(f"Error checking canary health: {str(e)}")
        return {
            'healthy': False,
            'reason': f"Error checking health: {str(e)}"
        }


def get_listener_rules() -> Dict[str, Any]:
    """
    Get current listener configuration

    Returns:
        Current listener configuration
    """
    try:
        response = elbv2_client.describe_listeners(ListenerArns=[LISTENER_ARN])
        return response['Listeners'][0] if response['Listeners'] else {}
    except ClientError as e:
        print(f"Error getting listener rules: {str(e)}")
        return {}


def save_deployment_state(state: Dict[str, Any]) -> None:
    """
    Save deployment state to DynamoDB

    Args:
        state: Deployment state to save
    """
    try:
        table_name = os.environ.get('DYNAMODB_TABLE_NAME',
                                   f"{os.environ.get('PROJECT_NAME', 'lumina')}-canary-state")

        item = {
            'deployment_id': {'S': state['deployment_id']},
            'timestamp': {'N': str(state.get('last_update', int(time.time())))},
            'status': {'S': state['status']},
            'state_data': {'S': json.dumps(state)},
            'ttl': {'N': str(int(time.time()) + 86400 * 30)}  # 30 days TTL
        }

        dynamodb_client.put_item(TableName=table_name, Item=item)
        print(f"Saved deployment state: {state['deployment_id']}")

    except ClientError as e:
        print(f"Error saving deployment state: {str(e)}")


def get_latest_deployment_state() -> Optional[Dict[str, Any]]:
    """
    Get latest deployment state from DynamoDB

    Returns:
        Latest deployment state or None
    """
    try:
        table_name = os.environ.get('DYNAMODB_TABLE_NAME',
                                   f"{os.environ.get('PROJECT_NAME', 'lumina')}-canary-state")

        response = dynamodb_client.query(
            TableName=table_name,
            IndexName='StatusIndex',
            KeyConditionExpression='#status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': {'S': 'in_progress'}},
            ScanIndexForward=False,
            Limit=1
        )

        if response['Items']:
            state_data = response['Items'][0]['state_data']['S']
            return json.loads(state_data)

        return None

    except ClientError as e:
        print(f"Error getting deployment state: {str(e)}")
        return None


def send_notification(subject: str, message: str) -> None:
    """
    Send SNS notification

    Args:
        subject: Email subject
        message: Email message
    """
    try:
        sns_client.publish(
            TopicArn=SNS_TOPIC_ARN,
            Subject=subject,
            Message=message
        )
        print(f"Notification sent: {subject}")
    except ClientError as e:
        print(f"Error sending notification: {str(e)}")
