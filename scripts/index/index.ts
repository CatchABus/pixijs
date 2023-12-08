import fs from 'fs';
import glob from 'glob';
import { basename, extname, join } from 'path';

const directoryPath = join(process.cwd(), './src');

// find all directories in src
const directories = glob.sync('*/', { cwd: directoryPath, absolute: true });

// Use glob to find all TypeScript files recursively in the directory
directories.forEach((directory) =>
{
    const files = glob.sync('**/*[!.d].ts', {
        cwd: directory,
        ignore: [
            '**/init.ts',
            // for bundles this is not needed, and for normal build it gets added by the browser extension
            '**/browserAll.ts',
            // same as above
            '**/webworkerAll.ts',
            // TODO: we need to convert these to strings with a rollup plugin otherwise they get added to the global scope
            // the current rollup plugin only fixes this issue for the non bundled build as it replaces the import string
            // with a new file that is formatted correctly
            '**/BasisWorker.ts',
            '**/KTXWorker.ts',
        ],
    });

    // Generate export statements for each file
    const exportStatements = files.map((file) => `export * from './${file.replace(/\.ts$/, '')}';`);

    // now grab all vert/frag shaders
    const shaders = glob.sync('**/*.{vert,frag,glsl,wgsl}', { cwd: directory });

    // Generate export statements for each shader
    const shaderExportStatements = shaders.map((file) =>
    {
        const replace = file.replace(/\.(vert|frag|glsl|wgsl)$/, '');
        let shortName = basename(replace).replace(/-([a-z])/g, (_, group1) => group1.toUpperCase());
        const ext = extname(file).slice(1);

        shortName += ext.charAt(0).toUpperCase() + ext.slice(1);

        return `export { default as ${shortName} } from './${file}';`;
    });

    // Combine the export statements into one file
    exportStatements.push(...shaderExportStatements, '');

    // console.log(join(directory, 'index.ts'), exportStatements.join('\n'));
    // Write the export statements to the index.ts file
    fs.writeFileSync(join(directory, 'index.ts'), exportStatements.join('\n'), { encoding: 'utf-8' });
});
