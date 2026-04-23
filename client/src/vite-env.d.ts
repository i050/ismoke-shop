/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_PRODUCT_IMAGE_MAX_FILE_SIZE_MB?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
