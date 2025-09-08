import { IsOptional, IsString, IsEmail, IsInt } from 'class-validator';

export class CreateBranchesDto {
  @IsOptional()
  @IsInt()
  serviceProviderID?: number;

  @IsOptional()
  @IsInt()
  companyID?: number;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  pfNo?: string;

  @IsOptional()
  @IsString()
  tanNo?: string;

  @IsOptional()
  @IsString()
  esiNo?: string;

  @IsOptional()
  @IsString()
  linNo?: string;

  @IsOptional()
  @IsString()
  gstNo?: string;

  @IsOptional()
  @IsString()
  shopRegNo?: string;

  @IsOptional()
  @IsString()
  financialYearStart?: string;

  @IsOptional()
  @IsString()
  contactNo?: string;

  @IsOptional()
  @IsEmail()
  emailAdd?: string;

  @IsOptional()
  @IsString()
  companyLogoUrl?: string;

  @IsOptional()
  @IsString()
  SignatureUrl?: string;
}
