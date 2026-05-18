import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { UserService } from './services/user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UserGuard } from '../auth/guards/user.guard';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @UseGuards(AdminGuard)
    @Post()
    create(@Request() req, @Body() createUserDto: CreateUserDto) {
        const adminId = req.user.userId;
        return this.userService.create(createUserDto, adminId);
    }

    @UseGuards(AdminGuard)
    @Get()
    findAll() {
        return this.userService.findAll();
    }

    @UseGuards(AdminGuard)
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.userService.findOne(id);
    }

    @UseGuards(AdminGuard)
    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
        return this.userService.update(id, updateUserDto);
    }

    /**
     * Update own profile - authenticated user can update firstName, lastName, email
     * Password changes require current password verification
     */
    @UseGuards(UserGuard)
    @Patch('me/profile')
    updateMyProfile(@Request() req, @Body() updateUserDto: UpdateUserDto) {
        const userId = req.user.userId;
        return this.userService.updateMyProfile(userId, updateUserDto);
    }

    /**
     * Change own password - authenticated user can change their password
     * Requires current password verification
     */
    @UseGuards(UserGuard)
    @Patch('me/change-password')
    changeMyPassword(@Request() req, @Body() body: { currentPassword: string; newPassword: string }) {
        const userId = req.user.userId;
        return this.userService.changeMyPassword(userId, body.currentPassword, body.newPassword);
    }

    @UseGuards(AdminGuard)
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.userService.remove(id);
    }
    @UseGuards(AdminGuard)
    @Patch(':id/reset-password')
    resetPassword(
        @Param('id', ParseIntPipe) id: number,
        @Request() req,
        @Body() resetPasswordDto: ResetPasswordDto,
    ) {
        const adminId = req.user.userId;
        return this.userService.resetPassword(id, adminId, resetPasswordDto.password);
    }
}
