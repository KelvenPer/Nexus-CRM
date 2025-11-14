"""Processing configuration for proof uploads."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class ImageConfig:
    max_width: int = 1920
    max_height: int = 1080
    quality: int = 85
    thumb_width: int = 400
    thumb_height: int = 300
    thumb_quality: int = 80


@dataclass(frozen=True)
class ValidationConfig:
    max_file_size: int = 10 * 1024 * 1024
    allowed_mimes: tuple[str, ...] = (
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
    )
    min_width: int = 100
    min_height: int = 100
    max_width: int = 4000
    max_height: int = 4000


@dataclass(frozen=True)
class StorageConfig:
    original_path: str = "uploads/proofs/original"
    processed_path: str = "uploads/proofs/processed"
    thumbnail_path: str = "uploads/proofs/thumbnails"
    s3_bucket: str | None = os.getenv("S3_BUCKET")
    s3_region: str | None = os.getenv("S3_REGION")


IMAGE_CONFIG = ImageConfig()
VALIDATION_CONFIG = ValidationConfig()
STORAGE_CONFIG = StorageConfig()
