import { nextPow2 } from '../../../../maths/pow2';
import { TextureSource } from './sources/TextureSource';
import { Texture } from './Texture';

import type { TextureSourceOptions } from './sources/TextureSource';

let count = 0;

/**
 * Texture pool, used by FilterSystem and plugins.
 *
 * Stores collection of temporary pow2 or screen-sized renderTextures
 *
 * If you use custom RenderTexturePool for your filters, you can use methods
 * `getFilterTexture` and `returnFilterTexture` same as in
 * @memberof PIXI
 */
export class TexturePoolClass
{
    public textureOptions: TextureSourceOptions;

    /**
     * Allow renderTextures of the same size as screen, not just pow2
     *
     * Automatically sets to true after `setScreenSize`
     * @default false
     */
    public enableFullScreen: boolean;

    private texturePool: {[x in string | number]: Texture[]};
    private poolKeyHash: Record<number, number> = {};

    /**
     * @param textureOptions - options that will be passed to BaseRenderTexture constructor
     * @param {PIXI.SCALE_MODES} [textureOptions.scaleMode] - See {@link PIXI.SCALE_MODES} for possible values.
     */
    constructor(textureOptions?: TextureSourceOptions)
    {
        this.texturePool = {};
        this.textureOptions = textureOptions || {};
        this.enableFullScreen = false;
    }

    /**
     * Creates texture with params that were specified in pool constructor.
     * @param pixelWidth - Width of texture in pixels.
     * @param pixelHeight - Height of texture in pixels.
     * @param antialias
     */
    createTexture(pixelWidth: number, pixelHeight: number, antialias: boolean): Texture
    {
        const textureSource = new TextureSource({
            ...this.textureOptions,

            width: pixelWidth,
            height: pixelHeight,
            resolution: 1,
            antialias,
        });

        return new Texture({
            source: textureSource,
            label: `texturePool_${count++}`,
        });
    }

    /**
     * Gets a Power-of-Two render texture or fullScreen texture
     * @param frameWidth - The minimum width of the render texture.
     * @param frameHeight - The minimum height of the render texture.
     * @param resolution - The resolution of the render texture.
     * @param antialias
     * @returns The new render texture.
     */
    getOptimalTexture(frameWidth: number, frameHeight: number, resolution = 1, antialias: boolean): Texture
    {
        let po2Width = Math.ceil((frameWidth * resolution) - 1e-6);
        let po2Height = Math.ceil((frameHeight * resolution) - 1e-6);

        po2Width = nextPow2(po2Width);
        po2Height = nextPow2(po2Height);

        const key = (po2Width << 17) + (po2Height << 1) + (antialias ? 1 : 0);

        if (!this.texturePool[key])
        {
            this.texturePool[key] = [];
        }

        let texture = this.texturePool[key].pop();

        if (!texture)
        {
            texture = this.createTexture(po2Width, po2Height, antialias);
        }

        texture.source.resolution = resolution;
        texture.source.width = po2Width / resolution;
        texture.source.height = po2Height / resolution;
        texture.source.pixelWidth = po2Width;
        texture.source.pixelHeight = po2Height;

        // fit the layout to the requested original size
        texture.frameX = 0;
        texture.frameY = 0;
        texture.frameWidth = frameWidth;
        texture.frameHeight = frameHeight;
        texture.layout.update();

        this.poolKeyHash[texture.id] = key;

        return texture;
    }

    getSameSizeTexture(texture: Texture)
    {
        const source = texture.source;

        return this.getOptimalTexture(source.width, source.height, source.resolution, source.antialias);
    }

    /**
     * Place a render texture back into the pool.
     * @param renderTexture - The renderTexture to free
     */
    returnTexture(renderTexture: Texture): void
    {
        const key = this.poolKeyHash[renderTexture.id];

        this.texturePool[key].push(renderTexture);
    }

    /**
     * Clears the pool.
     * @param destroyTextures - Destroy all stored textures.
     */
    clear(destroyTextures?: boolean): void
    {
        destroyTextures = destroyTextures !== false;
        if (destroyTextures)
        {
            for (const i in this.texturePool)
            {
                const textures = this.texturePool[i];

                if (textures)
                {
                    for (let j = 0; j < textures.length; j++)
                    {
                        textures[j].destroy(true);
                    }
                }
            }
        }

        this.texturePool = {};
    }
}

export const TexturePool = new TexturePoolClass();