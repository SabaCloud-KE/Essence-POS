import { IsInt, Min, Max } from 'class-validator';

export class UpdateSessionTimeoutDto {
  @IsInt()
  @Min(1)
  @Max(720)
  adminTimeoutMinutes: number;

  @IsInt()
  @Min(1)
  @Max(720)
  staffTimeoutMinutes: number;
}
