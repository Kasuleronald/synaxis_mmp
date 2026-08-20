import { IsIn, IsString, IsUUID, MinLength } from "class-validator";

// Extend this list as more entities get delete-approval support -- the
// dispatch in DeletionRequestsService.approve() has to grow alongside it.
export const DELETABLE_ENTITY_TYPES = ["member", "household", "fellowship", "orgUnit"] as const;
export type DeletableEntityType = (typeof DELETABLE_ENTITY_TYPES)[number];

export class CreateDeletionRequestDto {
  @IsIn(DELETABLE_ENTITY_TYPES)
  entityType!: DeletableEntityType;

  @IsUUID()
  entityId!: string;

  @IsString()
  @MinLength(1)
  entityLabel!: string;
}
