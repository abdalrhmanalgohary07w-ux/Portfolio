import sql from 'mssql';

const config = {
    server: 'db43366.public.databaseasp.net',
    database: 'db43366',
    user: 'db43366',
    password: '4n=JN-8f_bD2',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let pool = null;

export async function getPool() {
    if (pool && pool.connected) return pool;
    pool = await sql.connect(config);
    return pool;
}

export async function createSchema(pool) {
    await pool.request().query(`
        -- Profile (single row)
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='profile' AND xtype='U')
        CREATE TABLE profile (
            id          INT PRIMARY KEY DEFAULT 1,
            name        NVARCHAR(255),
            tagline     NVARCHAR(500),
            role        NVARCHAR(255),
            description NVARCHAR(MAX),
            email       NVARCHAR(255),
            whatsapp    NVARCHAR(50),
            github      NVARCHAR(500),
            linkedin    NVARCHAR(500),
            hero_image  NVARCHAR(500)
        );

        -- About text paragraphs
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='about_text' AND xtype='U')
        CREATE TABLE about_text (
            id         INT IDENTITY(1,1) PRIMARY KEY,
            sort_order INT DEFAULT 0,
            content    NVARCHAR(MAX)
        );

        -- About highlights
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='about_highlights' AND xtype='U')
        CREATE TABLE about_highlights (
            id         INT IDENTITY(1,1) PRIMARY KEY,
            sort_order INT DEFAULT 0,
            content    NVARCHAR(255)
        );

        -- About images (photo stack)
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='about_images' AND xtype='U')
        CREATE TABLE about_images (
            id         INT IDENTITY(1,1) PRIMARY KEY,
            sort_order INT DEFAULT 0,
            image_url  NVARCHAR(500)
        );

        -- Projects
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='projects' AND xtype='U')
        CREATE TABLE projects (
            id          INT IDENTITY(1,1) PRIMARY KEY,
            sort_order  INT DEFAULT 0,
            title       NVARCHAR(255),
            description NVARCHAR(MAX),
            image_url   NVARCHAR(500),
            github_url  NVARCHAR(500),
            live_url    NVARCHAR(500)
        );

        -- Project tech stack
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='project_tech' AND xtype='U')
        CREATE TABLE project_tech (
            id         INT IDENTITY(1,1) PRIMARY KEY,
            project_id INT NOT NULL,
            tech       NVARCHAR(100),
            sort_order INT DEFAULT 0,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        -- Certificates
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='certificates' AND xtype='U')
        CREATE TABLE certificates (
            id           INT IDENTITY(1,1) PRIMARY KEY,
            sort_order   INT DEFAULT 0,
            title        NVARCHAR(255),
            organization NVARCHAR(255),
            full_org_name NVARCHAR(500),
            year         NVARCHAR(10),
            image_url    NVARCHAR(500)
        );

        -- Certificate details
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='certificate_details' AND xtype='U')
        CREATE TABLE certificate_details (
            id             INT IDENTITY(1,1) PRIMARY KEY,
            certificate_id INT NOT NULL,
            detail         NVARCHAR(MAX),
            sort_order     INT DEFAULT 0,
            FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE
        );

        -- Tech stack (marquee)
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='tech_stack' AND xtype='U')
        CREATE TABLE tech_stack (
            id         INT IDENTITY(1,1) PRIMARY KEY,
            sort_order INT DEFAULT 0,
            name       NVARCHAR(100),
            icon       NVARCHAR(100),
            color      NVARCHAR(20)
        );

        -- Binary image storage
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='portfolio_images' AND xtype='U')
        CREATE TABLE portfolio_images (
            id         INT IDENTITY(1,1) PRIMARY KEY,
            image_data VARBINARY(MAX) NOT NULL,
            mime_type  NVARCHAR(50) DEFAULT 'image/png',
            created_at DATETIME DEFAULT GETDATE()
        );
    `);
}

export async function readPortfolioData(pool) {
    const [profileRes, textRes, highlightsRes, aboutImgsRes, projectsRes, certsRes, techRes] =
        await Promise.all([
            pool.request().query('SELECT * FROM profile WHERE id = 1'),
            pool.request().query('SELECT content FROM about_text ORDER BY sort_order'),
            pool.request().query('SELECT content FROM about_highlights ORDER BY sort_order'),
            pool.request().query('SELECT image_url FROM about_images ORDER BY sort_order'),
            pool.request().query('SELECT * FROM projects ORDER BY sort_order'),
            pool.request().query('SELECT * FROM certificates ORDER BY sort_order'),
            pool.request().query('SELECT * FROM tech_stack ORDER BY sort_order'),
        ]);

    const p = profileRes.recordset[0] || {};

    // Projects with their tech
    const projects = await Promise.all(projectsRes.recordset.map(async proj => {
        const techRes = await pool.request()
            .input('pid', sql.Int, proj.id)
            .query('SELECT tech FROM project_tech WHERE project_id = @pid ORDER BY sort_order');
        return {
            title: proj.title,
            description: proj.description,
            image: proj.image_url,
            tech: techRes.recordset.map(t => t.tech),
            github: proj.github_url,
            link: proj.live_url
        };
    }));

    // Certificates with their details
    const certificates = await Promise.all(certsRes.recordset.map(async cert => {
        const detRes = await pool.request()
            .input('cid', sql.Int, cert.id)
            .query('SELECT detail FROM certificate_details WHERE certificate_id = @cid ORDER BY sort_order');
        return {
            title: cert.title,
            organization: cert.organization,
            fullOrgName: cert.full_org_name,
            year: cert.year,
            image: cert.image_url,
            details: detRes.recordset.map(d => d.detail)
        };
    }));

    return {
        profile: {
            name: p.name, tagline: p.tagline, role: p.role,
            description: p.description, email: p.email, whatsapp: p.whatsapp,
            github: p.github, linkedin: p.linkedin, heroImage: p.hero_image
        },
        about: {
            text: textRes.recordset.map(r => r.content),
            highlights: highlightsRes.recordset.map(r => r.content),
            images: aboutImgsRes.recordset.map(r => r.image_url)
        },
        projects,
        certificates,
        techStack: techRes.recordset.map(t => ({ name: t.name, icon: t.icon, color: t.color }))
    };
}

export async function writePortfolioData(pool, data) {
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        const req = () => new sql.Request(transaction);

        // Profile upsert
        await req()
            .input('name', sql.NVarChar(255), data.profile.name)
            .input('tagline', sql.NVarChar(500), data.profile.tagline)
            .input('role', sql.NVarChar(255), data.profile.role)
            .input('description', sql.NVarChar(sql.MAX), data.profile.description)
            .input('email', sql.NVarChar(255), data.profile.email)
            .input('whatsapp', sql.NVarChar(50), data.profile.whatsapp)
            .input('github', sql.NVarChar(500), data.profile.github)
            .input('linkedin', sql.NVarChar(500), data.profile.linkedin)
            .input('hero_image', sql.NVarChar(500), data.profile.heroImage)
            .query(`
                IF EXISTS (SELECT 1 FROM profile WHERE id=1)
                    UPDATE profile SET name=@name, tagline=@tagline, role=@role,
                        description=@description, email=@email, whatsapp=@whatsapp,
                        github=@github, linkedin=@linkedin, hero_image=@hero_image WHERE id=1
                ELSE
                    INSERT INTO profile (id,name,tagline,role,description,email,whatsapp,github,linkedin,hero_image)
                    VALUES (1,@name,@tagline,@role,@description,@email,@whatsapp,@github,@linkedin,@hero_image)
            `);

        // About text — replace all
        await req().query('DELETE FROM about_text');
        for (let i = 0; i < data.about.text.length; i++) {
            await req().input('so', sql.Int, i).input('c', sql.NVarChar(sql.MAX), data.about.text[i])
                .query('INSERT INTO about_text (sort_order,content) VALUES (@so,@c)');
        }

        // About highlights
        await req().query('DELETE FROM about_highlights');
        for (let i = 0; i < data.about.highlights.length; i++) {
            await req().input('so', sql.Int, i).input('c', sql.NVarChar(255), data.about.highlights[i])
                .query('INSERT INTO about_highlights (sort_order,content) VALUES (@so,@c)');
        }

        // About images — track old URLs to detect orphan images
        const oldImgsRes = await req().query('SELECT image_url FROM about_images');
        const oldImgUrls = oldImgsRes.recordset.map(r => r.image_url);
        await req().query('DELETE FROM about_images');
        for (let i = 0; i < data.about.images.length; i++) {
            await req().input('so', sql.Int, i).input('url', sql.NVarChar(500), data.about.images[i])
                .query('INSERT INTO about_images (sort_order,image_url) VALUES (@so,@url)');
        }

        // Projects — delete all then re-insert (cascades to project_tech)
        await req().query('DELETE FROM project_tech');
        await req().query('DELETE FROM projects');
        for (let i = 0; i < data.projects.length; i++) {
            const proj = data.projects[i];
            const projResult = await req()
                .input('so', sql.Int, i)
                .input('t', sql.NVarChar(255), proj.title)
                .input('d', sql.NVarChar(sql.MAX), proj.description)
                .input('img', sql.NVarChar(500), proj.image)
                .input('gh', sql.NVarChar(500), proj.github)
                .input('lnk', sql.NVarChar(500), proj.link)
                .query(`INSERT INTO projects (sort_order,title,description,image_url,github_url,live_url)
                        OUTPUT INSERTED.id VALUES (@so,@t,@d,@img,@gh,@lnk)`);
            const projId = projResult.recordset[0].id;
            for (let j = 0; j < proj.tech.length; j++) {
                await req()
                    .input('pid', sql.Int, projId)
                    .input('tech', sql.NVarChar(100), proj.tech[j])
                    .input('so', sql.Int, j)
                    .query('INSERT INTO project_tech (project_id,tech,sort_order) VALUES (@pid,@tech,@so)');
            }
        }

        // Certificates — cascade-delete then re-insert
        await req().query('DELETE FROM certificate_details');
        await req().query('DELETE FROM certificates');
        for (let i = 0; i < data.certificates.length; i++) {
            const cert = data.certificates[i];
            const certResult = await req()
                .input('so', sql.Int, i)
                .input('t', sql.NVarChar(255), cert.title)
                .input('org', sql.NVarChar(255), cert.organization)
                .input('forg', sql.NVarChar(500), cert.fullOrgName)
                .input('yr', sql.NVarChar(10), cert.year)
                .input('img', sql.NVarChar(500), cert.image)
                .query(`INSERT INTO certificates (sort_order,title,organization,full_org_name,year,image_url)
                        OUTPUT INSERTED.id VALUES (@so,@t,@org,@forg,@yr,@img)`);
            const certId = certResult.recordset[0].id;
            for (let j = 0; j < cert.details.length; j++) {
                await req()
                    .input('cid', sql.Int, certId)
                    .input('det', sql.NVarChar(sql.MAX), cert.details[j])
                    .input('so', sql.Int, j)
                    .query('INSERT INTO certificate_details (certificate_id,detail,sort_order) VALUES (@cid,@det,@so)');
            }
        }

        // Tech stack
        await req().query('DELETE FROM tech_stack');
        for (let i = 0; i < data.techStack.length; i++) {
            const t = data.techStack[i];
            await req()
                .input('so', sql.Int, i)
                .input('nm', sql.NVarChar(100), t.name)
                .input('ico', sql.NVarChar(100), t.icon)
                .input('clr', sql.NVarChar(20), t.color)
                .query('INSERT INTO tech_stack (sort_order,name,icon,color) VALUES (@so,@nm,@ico,@clr)');
        }

        await transaction.commit();

        // Cleanup orphan images (non-fatal)
        try {
            const allUrls = JSON.stringify(data);
            const usedIds = [...allUrls.matchAll(/\/api\/images\/(\d+)/g)].map(m => parseInt(m[1]));
            const allImgs = await pool.request().query('SELECT id FROM portfolio_images');
            for (const { id } of allImgs.recordset) {
                if (!usedIds.includes(id)) {
                    await pool.request().input('id', sql.Int, id)
                        .query('DELETE FROM portfolio_images WHERE id=@id');
                }
            }
        } catch (_) { }

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

export { sql };
