const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando seeds...');

    // Crear roles
    const roles = [
        { nombre: 'administrador' },
        { nombre: 'cajero' },
        { nombre: 'mesero' }
    ];

    for (const rol of roles) {
        await prisma.rol.upsert({
            where: { nombre: rol.nombre },
            update: {},
            create: {
                nombre: rol.nombre
            }
        });
    }

    console.log('Roles creados correctamente');

    // Crear sucursal principal
    const sucursalPrincipal = await prisma.sucursal.upsert({
        where: { id_sucursal: 1 },
        update: {},
        create: {
            nombre_sucursal: 'Terraza',
            direccion: 'Dg. 81c #72b-78 Tercer piso',
            telefono: '3058166649'
        }
    });

    console.log('Sucursal principal creada correctamente');

    // Crear usuario administrador
    const rolAdmin = await prisma.rol.findFirst({
        where: { nombre: 'administrador' }
    });

    const hashedPasswordAdmin = await bcrypt.hash('B4r2025/*', 10)

    await prisma.usuario.upsert({
        where: { usuario: 'Admin' },
        update: {},
        create: {
            nombre: 'Administrador',
            apellido: 'Sistema',
            usuario: 'Admin',
            contrasena: hashedPasswordAdmin,
            id_rol: rolAdmin.id_rol,
            id_sucursal: sucursalPrincipal.id_sucursal,
        }
    })

    console.log('Usuario administrador creado correctamente');

    // Crear usuario cajero
    const rolCajero = await prisma.rol.findFirst({
        where: { nombre: 'cajero' }
    });

    const hashedPasswordCajero = await bcrypt.hash('B4r2025/*', 10);

    await prisma.usuario.upsert({
        where: { usuario: 'Cajero' },
        update: {},
        create: {
            nombre: 'Cajero',
            apellido: 'Sistema',
            usuario: 'Cajero',
            contrasena: hashedPasswordCajero,
            id_rol: rolCajero.id_rol,
            id_sucursal: sucursalPrincipal.id_sucursal,
        }
    });

    console.log('Usuario cajero creado correctamente');

    // Crear usuario mesero
    const rolMesero = await prisma.rol.findFirst({
        where: { nombre: 'mesero' }
    });

    const hashedPasswordMesero = await bcrypt.hash('B4r2025/*', 10);

    await prisma.usuario.upsert({
        where: { usuario: 'mesero' },
        update: {},
        create: {
            nombre: 'Mesero',
            apellido: 'Sistema',
            usuario: 'mesero',
            contrasena: hashedPasswordMesero,
            id_rol: rolMesero.id_rol,
            id_sucursal: sucursalPrincipal.id_sucursal,
        }
    });

    console.log('Usuario mesero creado correctamente');

    // Crear mesas para la sucursal principal
    for (let i = 1; i <= 5; i++) {
        await prisma.mesa.upsert({
            where: {
                numero_id_sucursal: {
                    numero: i,
                    id_sucursal: sucursalPrincipal.id_sucursal
                }
            },
            update: {},
            create: {
                numero: i,
                estado: 'libre',
                is_active: true,
                id_sucursal: sucursalPrincipal.id_sucursal
            }
        });
    }

    console.log('Mesas creadas correctamente');

    // Crear algunos productos
    const productos = [
        {
            nombre_producto: "Johnnie Walker Blue Label",
            descripcion: "Whisky escocés premium de mezcla suave y compleja.",
            precio_compra: 1500000,
            precio_venta: 2200000,
            is_active: true
        },
        {
            nombre_producto: "Chivas Regal 18 Años",
            descripcion: "Whisky escocés añejado 18 años, con notas de chocolate y caramelo.",
            precio_compra: 260000,
            precio_venta: 346000,
            is_active: true
        },
        {
            nombre_producto: "Buchanan’s Master",
            descripcion: "Whisky escocés suave con carácter frutal y notas ahumadas.",
            precio_compra: 650000,
            precio_venta: 950000,
            is_active: true
        },
        {
            nombre_producto: "Old Parr 12 Años",
            descripcion: "Whisky escocés de sabor robusto y final suave.",
            precio_compra: 250000,
            precio_venta: 346000,
            is_active: true
        },
        {
            nombre_producto: "Jack Daniel’s Old Nº7",
            descripcion: "Tennessee Whiskey clásico con notas de vainilla y roble.",
            precio_compra: 140000,
            precio_venta: 186000,
            is_active: true
        },
        {
            nombre_producto: "Tequila Don Julio 70",
            descripcion: "Tequila cristalino añejado con suavidad y pureza únicas.",
            precio_compra: 480000,
            precio_venta: 650000,
            is_active: true
        },
        {
            nombre_producto: "Tequila 1800 Cristalino",
            descripcion: "Tequila suave con triple filtrado y notas dulces.",
            precio_compra: 520000,
            precio_venta: 625000,
            is_active: true
        },
        {
            nombre_producto: "Tequila Herradura Reposado",
            descripcion: "Tequila reposado con sabor balanceado a agave cocido y roble.",
            precio_compra: 280000,
            precio_venta: 368000,
            is_active: true
        },
        {
            nombre_producto: "Tequila Patrón Añejo",
            descripcion: "Tequila artesanal añejado con notas a madera y vainilla.",
            precio_compra: 730000,
            precio_venta: 980000,
            is_active: true
        },
        {
            nombre_producto: "Tequila Olmeca Blanco",
            descripcion: "Tequila blanco con perfil fresco y cítrico, ideal para cócteles.",
            precio_compra: 185000,
            precio_venta: 243000,
            is_active: true
        },
        {
            nombre_producto: "Mezcal 400 Conejos",
            descripcion: "Mezcal artesanal con aroma ahumado y sabor herbal.",
            precio_compra: 350000,
            precio_venta: 435000,
            is_active: true
        },
        {
            nombre_producto: "Ron XO 25 Años",
            descripcion: "Ron añejado 25 años con cuerpo complejo y notas de caramelo.",
            precio_compra: 890000,
            precio_venta: 1155000,
            is_active: true
        },
        {
            nombre_producto: "Ron Medellín 3 Años",
            descripcion: "Ron colombiano joven con sabor suave y accesible.",
            precio_compra: 29000,
            precio_venta: 43000,
            is_active: true
        },
        {
            nombre_producto: "Aguardiente Antioqueño Real",
            descripcion: "Aguardiente sin azúcar, fuerte y tradicional de Antioquia.",
            precio_compra: 195000,
            precio_venta: 287000,
            is_active: true
        },
        {
            nombre_producto: "Aguardiente Mil Demonios",
            descripcion: "Aguardiente premium con notas herbales y frescura intensa.",
            precio_compra: 68000,
            precio_venta: 95000,
            is_active: true
        }
    ];

    for (const producto of productos) {
        const createdProducto = await prisma.producto.create({
            data: producto
        });

        // Crear inventario para cada producto
        await prisma.inventario.create({
            data: {
                id_producto: createdProducto.id_producto,
                id_sucursal: sucursalPrincipal.id_sucursal,
                cantidad: 5,
                alerta: 2
            }
        });
    }

    console.log('Productos e inventario creados correctamente');

    console.log('Seeds ejecutados correctamente');

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });