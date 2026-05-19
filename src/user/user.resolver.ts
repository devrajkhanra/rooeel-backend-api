import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';

import { UserService } from './services/user.service';
import { User } from './models/user.model';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { ChangePasswordInput } from './dto/change-password.input';
import { GqlAdminGuard } from '../auth/guards/gql-admin.guard';
import { GqlUserGuard } from '../auth/guards/gql-user.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';

@Resolver(() => User)
export class UserResolver {
    constructor(private readonly userService: UserService) { }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => User, { name: 'createUser' })
    createUser(
        @Args('createUserInput') createUserInput: CreateUserInput,
        @CurrentUser() admin: any,
    ) {
        return this.userService.create(createUserInput, admin.userId);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => [User], { name: 'users' })
    findAll() {
        return this.userService.findAll();
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => User, { name: 'user', nullable: true })
    findOne(@Args('id', { type: () => Int }) id: number) {
        return this.userService.findOne(id);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => User, { name: 'updateUser' })
    update(
        @Args('id', { type: () => Int }) id: number,
        @Args('updateUserInput') updateUserInput: UpdateUserInput,
    ) {
        return this.userService.update(id, updateUserInput);
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => User, { name: 'removeUser' })
    async remove(@Args('id', { type: () => Int }) id: number) {
        // Note: The service currently returns void, so you might want to return the removed ID 
        // or update the service to return the deleted User record.
        await this.userService.remove(id);
        // Stub return to satisfy GraphQL type, or modify service to return deleted user
        return { id };
    }

    @UseGuards(GqlAdminGuard)
    @Mutation(() => User, { name: 'adminResetUserPassword' })
    resetPassword(
        @Args('id', { type: () => Int }) id: number,
        @Args('newPassword') newPassword: string,
        @CurrentUser() admin: any,
    ) {
        return this.userService.resetPassword(id, admin.userId, newPassword);
    }

    // --- CURRENT USER (ME) OPERATIONS ---

    @UseGuards(GqlUserGuard)
    @Query(() => User, { name: 'me' })
    getMe(@CurrentUser() user: any) {
        return this.userService.findOne(user.userId);
    }

    @UseGuards(GqlUserGuard)
    @Mutation(() => User, { name: 'updateMyProfile' })
    updateMyProfile(
        @Args('updateUserInput') updateUserInput: UpdateUserInput,
        @CurrentUser() user: any,
    ) {
        return this.userService.updateMyProfile(user.userId, updateUserInput);
    }

    @UseGuards(GqlUserGuard)
    @Mutation(() => Boolean, { name: 'changeMyPassword' })
    async changeMyPassword(
        @Args('changePasswordInput') changePasswordInput: ChangePasswordInput,
        @CurrentUser() user: any,
    ) {
        await this.userService.changeMyPassword(
            user.userId,
            changePasswordInput.currentPassword,
            changePasswordInput.newPassword,
        );
        return true; // GraphQL needs a concrete return type
    }
}