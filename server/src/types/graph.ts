export type EntityType =
  | "Person"
  | "Organization"
  | "Project"
  | "Technology"
  | "Skill"
  | "Location"
  | "Certification"
  | "Education"
  | "Award"
  | "Publication";

export type RelationshipType =
  | "WORKED_AT"
  | "WORKED_ON"
  | "USES_TECH"
  | "HAS_SKILL"
  | "STUDIED_AT"
  | "EARNED"
  | "PUBLISHED"
  | "AWARDED"
  | "LOCATED_IN";

export interface GraphEntity {
  readonly name: string;
  readonly type: EntityType;
  readonly description?: string;
}

export interface GraphRelationship {
  readonly from: string;
  readonly to: string;
  readonly type: RelationshipType;
}

export interface ExtractionResult {
  readonly entities: GraphEntity[];
  readonly relationships: GraphRelationship[];
}

export interface GraphStats {
  readonly documentCount: number;
  readonly chunkCount: number;
  readonly entityCount: number;
  readonly relationshipCount: number;
}
