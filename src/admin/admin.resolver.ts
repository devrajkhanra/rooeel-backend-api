import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AdminService } from './services/admin.service';
import { Admin } from './models/admin.model';
import { CreateAdminInput } from './dto/create-admin.input';
import { UpdateAdminInput } from './dto/update-admin.input';
import { GqlAdminGuard } from '../auth/guards/gql-admin.guard';

@Resolver(() => Admin)
@UseGuards(GqlAdminGuard) // Secure all admin operations
export class AdminResolver {
    constructor(private readonly adminService: AdminService) { }

    // Note: The service has a create method. Exposing it here allows existing 
    // admins to create new sub-admins, which is a common enterprise pattern.
    @Mutation(() => Admin, { name: 'createAdmin' })
    create(@Args('createAdminInput') createAdminInput: CreateAdminInput) {
        return this.adminService.create(createAdminInput);
    }

    @Query(() => [Admin], { name: 'admins' })
    findAll() {
        return this.adminService.findAll();
    }

    @Query(() => Admin, { name: 'admin', nullable: true })
    findOne(@Args('id', { type: () => Int }) id: number) {
        return this.adminService.findOne(id);
    }

    @Mutation(() => Admin, { name: 'updateAdmin' })
    update(
        @Args('id', { type: () => Int }) id: number,
        @Args('updateAdminInput') updateAdminInput: UpdateAdminInput,
    ) {
        return this.adminService.update(id, updateAdminInput);
    }

    @Mutation(() => Admin, { name: 'removeAdmin' })
    async remove(@Args('id', { type: () => Int }) id: number) {
        await this.adminService.remove(id);
        return { id }; // Return an object with the deleted ID
    }
}