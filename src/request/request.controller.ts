import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    UseGuards,
    Request,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { RequestService } from './services/request.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UserGuard } from '../auth/guards/user.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('request')
export class RequestController {
    constructor(private readonly requestService: RequestService) { }

    // ── User endpoints ─────────────────────────────────────────────────────

    /**
     * Create a change request (authenticated user).
     * For requestType 'password': verifies current password and queues the request.
     * Admin must use generate-password to fulfil it.
     */
    @UseGuards(UserGuard)
    @Post()
    create(@Request() req, @Body() createRequestDto: CreateRequestDto) {
        const userId = req.user.userId;
        return this.requestService.createRequest(userId, createRequestDto);
    }

    /**
     * Forgot password — PUBLIC, no authentication required.
     * User provides their email; creates a pending 'password_reset' request
     * that is directed to the admin who created that user.
     */
    @HttpCode(HttpStatus.CREATED)
    @Post('forgot-password')
    forgotPassword(@Body() dto: ForgotPasswordDto) {
        return this.requestService.forgotPassword(dto.email);
    }

    /** Get all requests made by the authenticated user */
    @UseGuards(UserGuard)
    @Get()
    findMyRequests(@Request() req) {
        const userId = req.user.userId;
        return this.requestService.findAllByUser(userId);
    }

    // ── Admin endpoints ────────────────────────────────────────────────────

    /** Get all pending/processed requests directed to the authenticated admin */
    @UseGuards(AdminGuard)
    @Get('admin')
    findAdminRequests(@Request() req) {
        const adminId = req.user.userId;
        return this.requestService.findAllByAdmin(adminId);
    }

    /** Get a single request by ID (no auth — admins and users can view) */
    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.requestService.findOne(id);
    }

    /**
     * Generate a random password for a password or password_reset request.
     * Returns the plain-text generated password ONCE — admin must share it with the user.
     */
    @UseGuards(AdminGuard)
    @HttpCode(HttpStatus.OK)
    @Post(':id/generate-password')
    generatePassword(@Param('id', ParseIntPipe) id: number, @Request() req) {
        const adminId = req.user.userId;
        return this.requestService.generatePassword(id, adminId);
    }

    /** Approve a non-password request (applies the requestedValue to the user's record) */
    @UseGuards(AdminGuard)
    @Patch(':id/approve')
    approve(@Param('id', ParseIntPipe) id: number, @Request() req) {
        const adminId = req.user.userId;
        return this.requestService.approveRequest(id, adminId);
    }

    /** Reject any pending request */
    @UseGuards(AdminGuard)
    @Patch(':id/reject')
    reject(@Param('id', ParseIntPipe) id: number, @Request() req) {
        const adminId = req.user.userId;
        return this.requestService.rejectRequest(id, adminId);
    }
}
