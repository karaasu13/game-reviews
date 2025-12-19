import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import { authenticate, requireRole } from "../middleware/authMiddleware";
import { AppError } from "../utils/AppError";

const router = Router();

// Garante que o Cloudinary está configurado via env CLOUDINARY_URL
if (!process.env.CLOUDINARY_URL) {
	throw new Error("CLOUDINARY_URL is not set. Please add it to your environment.");
}
// Lê CLOUDINARY_URL do ambiente e força HTTPS nas URLs
cloudinary.config({ secure: true });

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60) || "cover";
};

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (!file.mimetype.startsWith("image/")) {
			return cb(new AppError("Only image files are allowed", 400));
		}
		cb(null, true);
	},
});

router.post(
	"/cover",
	authenticate,
	requireRole(["admin", "owner"]),
	upload.single("cover"),
	async (req, res) => {
		if (!req.file) {
			throw new AppError("Cover file is required", 400);
		}

		const fromTitle = typeof req.body?.title === "string" ? slugify(req.body.title) : "cover";
		const publicIdBase = `${fromTitle}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

		try {
			const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
				const stream = cloudinary.uploader.upload_stream(
					{
						folder: "covers",
						public_id: publicIdBase,
						overwrite: false,
						resource_type: "image",
					},
					(err: Error | undefined, result?: UploadApiResponse) => {
						if (err || !result) return reject(err ?? new Error("Upload failed"));
						return resolve(result);
					}
				);
				stream.end(req.file!.buffer);
			});

			res.status(201).json({ url: uploadResult.secure_url });
		} catch (error) {
			console.error("[upload:cloudinary] error", error);
			const msg = error instanceof Error ? error.message : "Failed to upload cover to Cloudinary";
			throw new AppError(msg, 500);
		}
	}
);

export default router;
