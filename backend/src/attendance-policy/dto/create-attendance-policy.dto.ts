import { IsOptional, IsString, IsInt, IsBoolean } from 'class-validator';

export class CreateAttendancePolicyDto {
  @IsOptional() @IsInt() serviceProviderID?: number;
  @IsOptional() @IsInt() companyID?: number;
  @IsOptional() @IsInt() branchesID?: number;

  @IsOptional() @IsString() attendancePolicyName?: string;
  @IsOptional() @IsString() workingHoursType?: string;

  @IsOptional() @IsInt() checkin_begin_before_min?: number;
  @IsOptional() @IsInt() checkout_end_after_min?: number;
  @IsOptional() @IsInt() checkin_grace_time_min?: number;
  @IsOptional() @IsInt() min_work_hours_half_day_min?: number;

  @IsOptional() @IsBoolean() allow_self_mark_attendance?: boolean;
  @IsOptional() @IsBoolean() allow_manager_update_ot?: boolean;

  @IsOptional() @IsInt() max_ot_hours_per_day_min?: number;
}
