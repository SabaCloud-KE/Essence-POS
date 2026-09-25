import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required.' })
  @Matches(/^[A-Za-z\s]{3,}$/, {
    message: 'Name must contain only letters and spaces, and be at least 3 characters long.',
  })
  name: string;

  @IsEmail({}, { message: 'Email address must be a valid email.' })
  @IsNotEmpty({ message: 'Email address is required.' })
  email: string;

  @IsOptional()
  @Matches(/^\d+$/, {
    message: 'Phone number must only contain integers.',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long.' })
  password?: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z\s]{3,}$/, {
    message: 'Name must contain only letters and spaces, and be at least 3 characters long.',
  })
  name?: string;

  @IsOptional()
  @Matches(/^\d+$/, {
    message: 'Phone number must only contain integers.',
  })
  phone?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  isActive?: boolean;
}

export class ResetUserPasswordDto {
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long.' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
    {
      message:
        'Password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters.',
    },
  )
  newPassword: string;
}
