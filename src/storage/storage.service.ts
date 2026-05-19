import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
    private s3Client: S3Client;
    private bucketName: string;
    private isMinio: boolean;

    constructor(private configService: ConfigService) {
        // Read your specific .env variables
        this.isMinio = this.configService.get<string>('USE_MINIO') === 'true';
        this.bucketName = this.configService.get<string>('MINIO_BUCKET') || 'rooeel';

        const s3Config: any = {
            // S3 requires a region, even for MinIO. us-east-1 is the standard fallback.
            region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
        };

        if (this.isMinio) {
            // --- DEVELOPMENT (MinIO) CONFIGURATION ---
            s3Config.endpoint = `http://${this.configService.get<string>('MINIO_ENDPOINT')}`; // http://minio:9000
            s3Config.forcePathStyle = true; // Crucial for MinIO to work
            s3Config.credentials = {
                accessKeyId: this.configService.get<string>('MINIO_ROOT_USER'),
                secretAccessKey: this.configService.get<string>('MINIO_ROOT_PASSWORD'),
            };
        } else {
            // --- PRODUCTION (AWS S3) CONFIGURATION ---
            // When USE_MINIO=false, AWS SDK will automatically look for standard AWS env variables:
            // AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.
            // If deployed to AWS ECS/EC2 with an IAM role, you can even omit credentials entirely!
            s3Config.credentials = {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
            };
        }

        this.s3Client = new S3Client(s3Config);
    }

    async uploadFile(file: Express.Multer.File, folder: string = 'work-orders'): Promise<string> {
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

        try {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                }),
            );
            return fileName; // Save this key in Prisma (e.g., 'work-orders/1234.pdf')
        } catch (error) {
            console.error('S3 Upload Error:', error);
            throw new InternalServerErrorException('Failed to upload file to storage');
        }
    }

    async deleteFile(fileKey: string): Promise<void> {
        try {
            await this.s3Client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: fileKey,
                }),
            );
        } catch (error) {
            console.error('S3 Delete Error:', error);
            throw new InternalServerErrorException('Failed to delete file from storage');
        }
    }

    // Generate the URL for the frontend to view the PDF
    getFileUrl(fileKey: string): string | null {
        if (!fileKey) return null;

        if (this.isMinio) {
            // DOCKER TIP: We use localhost instead of minio:9000 here so the 
            // admin's browser (outside Docker) can actually render the PDF.
            return `http://localhost:9000/${this.bucketName}/${fileKey}`;
        }

        // Standard AWS S3 public URL format
        const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
        return `https://${this.bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
    }
}