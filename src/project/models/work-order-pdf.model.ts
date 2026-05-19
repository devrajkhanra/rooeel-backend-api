import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class WorkOrderPdf {
    @Field(() => Int)
    id: number;

    @Field()
    fileKey: string;

    @Field()
    fileName: string;

    @Field(() => Int)
    uploadedBy: number;

    @Field()
    createdAt: Date;

    // Resolved by the service — not stored in DB
    @Field({ nullable: true })
    fileUrl?: string;
}
