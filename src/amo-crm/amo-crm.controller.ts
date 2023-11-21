import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AmoCrmService } from './amo-crm.service';

@Controller('amo-crm')
export class AmoCrmController {
  constructor(private readonly amoCrmService: AmoCrmService) {}

  @Get('callback')
  async callback(@Req() req: Request) {
    const code = req.query.code as string;
    const tokens = await this.amoCrmService.exchangeCodeForToken(code);
    return `Successfully received token: ${tokens}`;
  }

  @Get('find-or-create-contact')
  async findOrCreateContact(
    @Query('name') name: string,
    @Query('email') email: string,
    @Query('phone') phone: string,
  ): Promise<void> {
    try {
      await this.amoCrmService.findOrCreateContact(name, email, phone);
    } catch (error) {
      throw new HttpException(
        'Failed to process request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
