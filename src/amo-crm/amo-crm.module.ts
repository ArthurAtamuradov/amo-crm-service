import { Module } from '@nestjs/common';
import { AmoCrmService } from './amo-crm.service';
import { AmoCrmController } from './amo-crm.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [AmoCrmService],
  controllers: [AmoCrmController],
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
})
export class AmoCrmModule {}
