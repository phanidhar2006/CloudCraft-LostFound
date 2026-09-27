import os

import boto3
from dotenv import load_dotenv


# =========================================================
# CLOUDCRAFT LOST & FOUND
# AWS CONFIGURATION
# =========================================================

# Load .env from the backend folder
BACKEND_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

load_dotenv(
    os.path.join(
        BACKEND_DIR,
        ".env"
    )
)


# =========================================================
# AWS SETTINGS
# =========================================================

AWS_REGION = os.getenv(
    "AWS_REGION",
    "eu-north-1"
)

S3_BUCKET = os.getenv(
    "S3_BUCKET",
    "cloudcraft-lost-found-2026-001"
)

DYNAMODB_TABLE = os.getenv(
    "DYNAMODB_TABLE",
    "CloudCraftLostFound"
)


# =========================================================
# AWS CLIENTS
# =========================================================

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION
)

dynamodb = boto3.resource(
    "dynamodb",
    region_name=AWS_REGION
)


# =========================================================
# DYNAMODB TABLE
# =========================================================

table = dynamodb.Table(
    DYNAMODB_TABLE
)