import { Module } from '@nestjs/common';
import { AmoCrmModule } from './amo-crm/amo-crm.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AmoCrmModule, ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
