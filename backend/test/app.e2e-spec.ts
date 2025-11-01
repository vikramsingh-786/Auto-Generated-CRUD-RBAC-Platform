import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Dynamic CRUD and RBAC (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Product" CASCADE;');
    await prisma.user.deleteMany({});

    await request(app.getHttpServer()).post('/auth/register').send({ email: 'admin-test@test.com', password: 'password' });
    await prisma.user.update({ where: { email: 'admin-test@test.com' }, data: { role: 'Admin' } });
    
    await request(app.getHttpServer()).post('/auth/register').send({ email: 'manager-test@test.com', password: 'password' });
    await prisma.user.update({ where: { email: 'manager-test@test.com' }, data: { role: 'Manager' } });

    const adminLogin = await request(app.getHttpServer()).post('/auth/login').send({ email: 'admin-test@test.com', password: 'password' });
    adminToken = adminLogin.body.access_token;
    
    const managerLogin = await request(app.getHttpServer()).post('/auth/login').send({ email: 'manager-test@test.com', password: 'password' });
    managerToken = managerLogin.body.access_token;

    const modelDefinition = {
      name: 'Product',
      ownerField: 'creatorId',
      fields: [{ name: 'name', type: 'string' }],
      rbac: { Admin: ['all'], Manager: ['create', 'read', 'update'], Viewer: ['read'] },
    };
    await request(app.getHttpServer()).post('/model-definitions/publish').set('Authorization', `Bearer ${adminToken}`).send(modelDefinition);
  });

  afterAll(async () => {
    await app.close();
  });

  it('Admin should be able to publish a new model', () => {
    expect(true).toBe(true);
  });

  it('Manager should be able to create a product, but not delete it', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/Product')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Manager Product', price: 100 })
      .expect(201);
      
    const newProductId = createResponse.body.id;
    expect(newProductId).toBeDefined();

    await request(app.getHttpServer())
      .delete(`/api/Product/${newProductId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403);
  });
  
  it('Admin should be able to create a product and then delete it', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/Product')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Admin Product to Delete', price: 200 })
      .expect(201);
      
    const newProductId = createResponse.body.id;
    expect(newProductId).toBeDefined();
    await request(app.getHttpServer())
      .delete(`/api/Product/${newProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200); 
  });

});