import { Controller, Get, Req } from '@nestjs/common';
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
}
