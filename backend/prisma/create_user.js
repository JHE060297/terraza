const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando creación de usuario...');

    // Crear usuario Cajero
    const rolCajero = await prisma.rol.findFirst({
        where: { nombre: 'cajero' }
    });

    const hashedPassword = await bcrypt.hash('test123', 10);

    await prisma.usuario.upsert({
        where: { usuario: 'johndoe' },
        update: {},
        create: {
            nombre: 'John',
            apellido: 'Doe',
            usuario: 'johndoe',
            contrasena: hashedPassword,
            id_rol: rolCajero.id_rol,
            id_sucursal: 1,
        }
    });

    console.log('Usuario Cajero creado correctamente');
    
}
main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
