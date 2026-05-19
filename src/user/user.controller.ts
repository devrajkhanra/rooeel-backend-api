import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    ParseIntPipe,
    UseGuards,
    Request,
} from '@nestjs/common';
import { UserService } from './services/user.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { RestAdminGuard } from '../auth/guards/rest-admin.guard';
import { RestAuthGuard } from '../auth/guards/rest-auth.guard';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @UseGuards(RestAdminGuard)
    @Post()
    create(@Request() req, @Body() createUserDto: CreateUserInput) {
        const adminId = req.user.userId;
        return this.userService.create(createUserDto, adminId);
    }

    @UseGuards(RestAdminGuard)
    @Get()
    findAll() {
        return this.userService.findAll();
    }

    @UseGuards(RestAdminGuard)
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.userService.findOne(id);
    }

    @UseGuards(RestAdminGuard)
    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateUserDto: UpdateUserInput,
    ) {
        return this.userService.update(id, updateUserDto);
    }

    /**
     * Update own profile - authenticated user can update firstName, lastName, email
     */
    @UseGuards(RestAuthGuard)
    @Patch('me/profile')
    updateMyProfile(@Request() req, @Body() updateUserDto: UpdateUserInput) {
        const userId = req.user.userId;
        return this.userService.updateMyProfile(userId, updateUserDto);
    }

    /**
     * Change own password - authenticated user can change their password
     */
    @UseGuards(RestAuthGuard)
    @Patch('me/change-password')
    changeMyPassword(
        @Request() req,
        @Body() body: { currentPassword: string; newPassword: string },
    ) {
        const userId = req.user.userId;
        return this.userService.changeMyPassword(
            userId,
            body.currentPassword,
            body.newPassword,
        );
    }

    @UseGuards(RestAdminGuard)
    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.userService.remove(id);
    }

    @UseGuards(RestAdminGuard)
    @Patch(':id/reset-password')
    resetPassword(
        @Param('id', ParseIntPipe) id: number,
        @Request() req,
        @Body() body: { password: string },
    ) {
        const adminId = req.user.userId;
        return this.userService.resetPassword(id, adminId, body.password);
    }
}
