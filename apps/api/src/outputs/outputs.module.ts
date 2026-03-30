import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Output, OutputSchema } from './output.schema';
import { OutputsController } from './outputs.controller';
import { OutputsService } from './outputs.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Output.name, schema: OutputSchema }]),
    StorageModule,
  ],
  controllers: [OutputsController],
  providers: [OutputsService],
  exports: [OutputsService],
})
export class OutputsModule {}
