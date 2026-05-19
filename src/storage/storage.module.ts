import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';

@Module({
    providers: [StorageService],
    exports: [StorageService], // crucial: allows other modules to use StorageService
})
export class StorageModule { }