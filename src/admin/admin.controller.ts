import { Controller, Get, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { AdminService } from './services/admin.service';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get()
    findAll() {
        return this.adminService.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateAdminDto: UpdateAdminDto) {
        return this.adminService.update(id, updateAdminDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.adminService.remove(id);
    }
}
