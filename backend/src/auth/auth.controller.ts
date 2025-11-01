import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthRegisterDto, AuthLoginDto } from './dto/auth.dto'; 
import { Public } from '../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: AuthLoginDto) { 
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  async register(@Body() registerDto: AuthRegisterDto) { 
    return this.authService.register(registerDto);
  }
}