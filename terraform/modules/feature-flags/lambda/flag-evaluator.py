#!/usr/bin/env python3
"""
Feature Flag Evaluator Lambda Function
Evaluates feature flags with context-based targeting and rollout strategies.
"""

import json
import os
import hashlib
from typing import Dict, Any, Optional, List
from datetime import datetime

import boto3
from botocore.exceptions import ClientError

# Initialize AWS clients
appconfig_client = boto3.client('appconfigdata')
dynamodb = boto3.resource('dynamodb')

# Environment variables
APPCONFIG_APPLICATION = os.environ['APPCONFIG_APPLICATION']
APPCONFIG_ENVIRONMENT = os.environ['APPCONFIG_ENVIRONMENT']
APPCONFIG_PROFILE = os.environ['APPCONFIG_PROFILE']
DYNAMODB_TABLE = os.environ['DYNAMODB_TABLE']

# Global cache for configuration
config_cache = {}
config_token = None


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for feature flag evaluation

    Args:
        event: API Gateway event with flag evaluation request
        context: Lambda context

    Returns:
        API Gateway response with flag evaluation results
    """
    try:
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event

        flag_key = body.get('flag_key')
        user_context = body.get('context', {})

        if not flag_key:
            return error_response(400, "flag_key is required")

        # Get feature flags configuration
        flags_config = get_feature_flags()

        # Evaluate flag
        result = evaluate_flag(flag_key, user_context, flags_config)

        # Store evaluation result
        store_evaluation(flag_key, user_context.get('user_id', 'anonymous'), result)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'flag_key': flag_key,
                'enabled': result['enabled'],
                'variant': result.get('variant'),
                'reason': result.get('reason'),
                'timestamp': datetime.utcnow().isoformat()
            })
        }

    except Exception as e:
        print(f"Error evaluating flag: {str(e)}")
        return error_response(500, str(e))


def get_feature_flags() -> Dict[str, Any]:
    """
    Get feature flags configuration from AppConfig with caching

    Returns:
        Feature flags configuration
    """
    global config_cache, config_token

    try:
        # Start configuration session if needed
        if not config_token:
            session_response = appconfig_client.start_configuration_session(
                ApplicationIdentifier=APPCONFIG_APPLICATION,
                EnvironmentIdentifier=APPCONFIG_ENVIRONMENT,
                ConfigurationProfileIdentifier=APPCONFIG_PROFILE
            )
            config_token = session_response['InitialConfigurationToken']

        # Get latest configuration
        response = appconfig_client.get_latest_configuration(
            ConfigurationToken=config_token
        )

        # Update token for next call
        config_token = response['NextPollConfigurationToken']

        # Update cache if configuration changed
        if response['Configuration']:
            config_content = response['Configuration'].read()
            if config_content:
                config_cache = json.loads(config_content)

        return config_cache

    except ClientError as e:
        print(f"Error getting feature flags: {str(e)}")
        # Return cached config on error
        return config_cache


def evaluate_flag(flag_key: str, context: Dict[str, Any], flags_config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluate a feature flag based on configuration and context

    Args:
        flag_key: Feature flag key
        context: User context for evaluation
        flags_config: Feature flags configuration

    Returns:
        Evaluation result with enabled status and reason
    """
    # Check if flag exists
    if flag_key not in flags_config.get('flags', {}):
        return {
            'enabled': False,
            'reason': 'flag_not_found'
        }

    flag_definition = flags_config['flags'][flag_key]
    flag_value = flags_config.get('values', {}).get(flag_key, {})

    # Check if flag is enabled globally
    if not flag_value.get('enabled', False):
        return {
            'enabled': False,
            'reason': 'flag_disabled'
        }

    # Evaluate rules
    rules = flag_value.get('rules', [])

    for rule in rules:
        if evaluate_rule(rule, context):
            return {
                'enabled': rule.get('enabled', True),
                'variant': rule.get('variant'),
                'reason': f"matched_rule: {rule.get('name', 'unnamed')}"
            }

    # Check percentage rollout
    if 'rollout_percentage' in flag_value:
        percentage = flag_value['rollout_percentage']
        user_id = context.get('user_id', context.get('session_id', 'anonymous'))

        if is_user_in_rollout(flag_key, user_id, percentage):
            return {
                'enabled': True,
                'reason': f"percentage_rollout: {percentage}%"
            }
        else:
            return {
                'enabled': False,
                'reason': f"not_in_rollout: {percentage}%"
            }

    # Default to enabled if no rules or rollout
    return {
        'enabled': True,
        'reason': 'default_enabled'
    }


def evaluate_rule(rule: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """
    Evaluate a targeting rule

    Args:
        rule: Rule definition
        context: User context

    Returns:
        True if rule matches, False otherwise
    """
    conditions = rule.get('conditions', [])

    # All conditions must be true (AND logic)
    for condition in conditions:
        if not evaluate_condition(condition, context):
            return False

    return True


def evaluate_condition(condition: Dict[str, Any], context: Dict[str, Any]) -> bool:
    """
    Evaluate a single condition

    Args:
        condition: Condition definition
        context: User context

    Returns:
        True if condition matches, False otherwise
    """
    attribute = condition.get('attribute')
    operator = condition.get('operator')
    values = condition.get('values', [])

    # Get attribute value from context
    context_value = context.get(attribute)

    if context_value is None:
        return False

    # Evaluate based on operator
    if operator == 'equals':
        return context_value in values
    elif operator == 'not_equals':
        return context_value not in values
    elif operator == 'contains':
        return any(val in str(context_value) for val in values)
    elif operator == 'not_contains':
        return not any(val in str(context_value) for val in values)
    elif operator == 'starts_with':
        return any(str(context_value).startswith(val) for val in values)
    elif operator == 'ends_with':
        return any(str(context_value).endswith(val) for val in values)
    elif operator == 'greater_than':
        try:
            return float(context_value) > float(values[0])
        except (ValueError, IndexError):
            return False
    elif operator == 'less_than':
        try:
            return float(context_value) < float(values[0])
        except (ValueError, IndexError):
            return False
    elif operator == 'in_list':
        return context_value in values
    elif operator == 'not_in_list':
        return context_value not in values
    else:
        return False


def is_user_in_rollout(flag_key: str, user_id: str, percentage: int) -> bool:
    """
    Determine if user is in percentage rollout using consistent hashing

    Args:
        flag_key: Feature flag key
        user_id: User identifier
        percentage: Rollout percentage (0-100)

    Returns:
        True if user is in rollout, False otherwise
    """
    # Create hash of flag_key + user_id for consistent assignment
    hash_input = f"{flag_key}:{user_id}".encode('utf-8')
    hash_value = int(hashlib.sha256(hash_input).hexdigest(), 16)

    # Convert hash to percentage (0-100)
    user_percentage = hash_value % 100

    return user_percentage < percentage


def store_evaluation(flag_key: str, user_id: str, result: Dict[str, Any]) -> None:
    """
    Store flag evaluation result in DynamoDB

    Args:
        flag_key: Feature flag key
        user_id: User identifier
        result: Evaluation result
    """
    try:
        table = dynamodb.Table(DYNAMODB_TABLE)

        item = {
            'flag_key': flag_key,
            'user_id': user_id,
            'enabled': result['enabled'],
            'reason': result.get('reason', ''),
            'variant': result.get('variant', ''),
            'timestamp': int(datetime.utcnow().timestamp()),
            'ttl': int(datetime.utcnow().timestamp()) + 86400 * 7  # 7 days TTL
        }

        table.put_item(Item=item)

    except ClientError as e:
        print(f"Error storing evaluation: {str(e)}")
        # Non-critical, don't fail the request


def error_response(status_code: int, message: str) -> Dict[str, Any]:
    """
    Create error response

    Args:
        status_code: HTTP status code
        message: Error message

    Returns:
        API Gateway error response
    """
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({
            'error': message,
            'timestamp': datetime.utcnow().isoformat()
        })
    }
