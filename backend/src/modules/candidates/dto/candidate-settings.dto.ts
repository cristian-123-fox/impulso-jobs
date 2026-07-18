import { IsBoolean, IsIn, IsString } from 'class-validator';
import { CandidateProfileSettings } from '@/modules/candidates/entities/candidate-profile-settings.entity';
import {
  INFORMATION_VISIBILITIES,
  InformationVisibility,
  PROFILE_VISIBILITIES,
  ProfileVisibility,
} from '@/modules/candidates/enums/candidate-settings.enum';

export class UpdateCandidateSettingsDto {
  @IsString()
  @IsIn(PROFILE_VISIBILITIES)
  profileVisibility!: ProfileVisibility;

  @IsString()
  @IsIn(INFORMATION_VISIBILITIES)
  informationVisibility!: InformationVisibility;

  @IsBoolean()
  isImmediatelyAvailable!: boolean;
}

export interface CandidateSettingsResponseDto {
  profileVisibility: ProfileVisibility;
  informationVisibility: InformationVisibility;
  isImmediatelyAvailable: boolean;
}

export function toCandidateSettingsResponse(
  settings: CandidateProfileSettings,
): CandidateSettingsResponseDto {
  return {
    profileVisibility: settings.profileVisibility,
    informationVisibility: settings.informationVisibility,
    isImmediatelyAvailable: settings.isImmediatelyAvailable,
  };
}
