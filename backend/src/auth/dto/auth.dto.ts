import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password: string;
}

export class VerifyMfaDto {
  @IsString()
  @IsNotEmpty()
  mfaToken: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
    {
      message:
        'New password must be at least 8 characters and include uppercase, lowercase, numbers, and special symbols.',
    },
  )
  newPassword: string;
}

export class ConfirmMfaSetupDto {
  @IsString()
  @IsNotEmpty()
  secret: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
