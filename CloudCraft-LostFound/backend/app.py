# ============================================================
# CLOUDCRAFT LOST & FOUND
# MASTER BACKEND
# Flask + Amazon S3 + Amazon DynamoDB
# ============================================================

import os
import re
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

PROJECT_DIR = os.path.dirname(BASE_DIR)

FRONTEND_DIR = os.path.join(
    PROJECT_DIR,
    "frontend"
)

load_dotenv(
    os.path.join(
        BASE_DIR,
        ".env"
    )
)


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

ADMIN_KEY = os.getenv("ADMIN_KEY", "")


# ============================================================
# AWS CLIENTS
# ============================================================

s3 = boto3.client(
    "s3",
    region_name=AWS_REGION
)

dynamodb = boto3.resource(
    "dynamodb",
    region_name=AWS_REGION
)

table = dynamodb.Table(
    DYNAMODB_TABLE
)


# ============================================================
# FLASK
# ============================================================

app = Flask(
    __name__,
    static_folder=None
)

CORS(app)

app.config["MAX_CONTENT_LENGTH"] = (
    5 * 1024 * 1024
)


# ============================================================
# CONSTANTS
# ============================================================

ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp"
}

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}

CATEGORIES = [
    "Electronics",
    "Documents",
    "Wallet",
    "Keys",
    "Clothing",
    "Bags",
    "Jewelry",
    "Books",
    "Accessories",
    "Other"
]

ITEM_TYPES = {
    "lost",
    "found"
}


# ============================================================
# HELPERS
# ============================================================

def clean(value):

    if value is None:
        return ""

    return str(value).strip()


def allowed_file(filename):

    if not filename:
        return False

    filename = filename.lower()

    if "." not in filename:
        return False

    extension = filename.rsplit(
        ".",
        1
    )[1]

    return extension in ALLOWED_EXTENSIONS


def get_extension(filename):

    filename = secure_filename(
        filename or ""
    )

    if "." not in filename:
        return ""

    return filename.rsplit(
        ".",
        1
    )[1].lower()


def get_image_content_type(extension):

    mapping = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp"
    }

    return mapping.get(
        extension,
        "application/octet-stream"
    )


def admin_authorized():

    supplied_key = request.headers.get(
        "X-Admin-Key",
        ""
    )

    return (
        bool(supplied_key)
        and supplied_key == ADMIN_KEY
    )


def admin_required_response():

    return jsonify({
        "success": False,
        "message": "Unauthorized admin access."
    }), 401


# ============================================================
# S3 IMAGE STREAMING
# ============================================================

def get_image_from_s3(image_key):

    if not image_key:
        return None

    try:

        result = s3.get_object(
            Bucket=S3_BUCKET,
            Key=image_key
        )

        body = result["Body"].read()

        content_type = (
            result.get(
                "ContentType"
            )
            or "application/octet-stream"
        )

        return body, content_type


    except ClientError as error:

        print(
            "S3 image retrieval error:",
            error
        )

        return None


    except Exception as error:

        print(
            "Unexpected S3 image error:",
            error
        )

        return None


# ============================================================
# IMAGE ROUTE
# ============================================================

@app.route(
    "/api/images/<path:image_key>",
    methods=["GET"]
)
def serve_image(image_key):

    result = get_image_from_s3(
        image_key
    )


    if result is None:

        return jsonify({
            "success": False,
            "message": "Image not found."
        }), 404


    image_data, content_type = result


    return Response(
        image_data,
        status=200,
        mimetype=content_type,
        headers={
            "Cache-Control":
                "public, max-age=3600"
        }
    )


# ============================================================
# SERIALIZATION
# ============================================================

def serialize_item(item):

    if not item:
        return None

    result = dict(item)


    result["possibleMatch"] = (
        result.get(
            "possibleMatch",
            False
        ) is True
    )


    image_key = result.get(
        "imageKey"
    )


    if image_key:

        # IMPORTANT:
        # Do not expose a presigned S3 URL.
        # Browser loads the image through Flask.

        result["imageUrl"] = (
            "/api/images/"
            + image_key
        )

    else:

        result["imageUrl"] = None


    return result


# ============================================================
# MATCHING
# ============================================================

def normalize_text(value):

    value = clean(
        value
    ).lower()

    value = re.sub(
        r"[^a-z0-9\s]",
        " ",
        value
    )

    value = re.sub(
        r"\s+",
        " ",
        value
    )

    return value.strip()


def title_words(title):

    words = normalize_text(
        title
    ).split()

    stop_words = {
        "the",
        "a",
        "an",
        "and",
        "of",
        "my",
        "is",
        "item"
    }

    return {
        word
        for word in words
        if len(word) >= 3
        and word not in stop_words
    }


def calculate_match_score(
    item_a,
    item_b
):

    type_a = clean(
        item_a.get("type")
    ).lower()

    type_b = clean(
        item_b.get("type")
    ).lower()


    if type_a == type_b:
        return 0


    score = 0


    category_a = normalize_text(
        item_a.get("category")
    )

    category_b = normalize_text(
        item_b.get("category")
    )


    if (
        category_a
        and category_a == category_b
    ):
        score += 2


    location_a = normalize_text(
        item_a.get("location")
    )

    location_b = normalize_text(
        item_b.get("location")
    )


    if (
        location_a
        and location_b
        and (
            location_a == location_b
            or location_a in location_b
            or location_b in location_a
        )
    ):
        score += 2


    color_a = normalize_text(
        item_a.get("color")
    )

    color_b = normalize_text(
        item_b.get("color")
    )


    if (
        color_a
        and color_b
        and color_a == color_b
    ):
        score += 1


    words_a = title_words(
        item_a.get("title")
    )

    words_b = title_words(
        item_b.get("title")
    )


    if words_a.intersection(
        words_b
    ):
        score += 1


    return score


def find_possible_match(new_item):

    try:

        response = table.scan()

        existing_items = response.get(
            "Items",
            []
        )


        while "LastEvaluatedKey" in response:

            response = table.scan(
                ExclusiveStartKey=
                response["LastEvaluatedKey"]
            )

            existing_items.extend(
                response.get(
                    "Items",
                    []
                )
            )


        best_match = None
        best_score = 0


        for existing in existing_items:

            status = clean(
                existing.get(
                    "status"
                )
            ).lower()


            if status == "rejected":
                continue


            if existing.get(
                "itemId"
            ) == new_item.get(
                "itemId"
            ):
                continue


            score = calculate_match_score(
                new_item,
                existing
            )


            if score > best_score:

                best_score = score
                best_match = existing


        if best_score >= 2:

            return (
                True,
                best_match,
                best_score
            )


        return (
            False,
            None,
            0
        )


    except Exception as error:

        print(
            "Possible match error:",
            error
        )

        return (
            False,
            None,
            0
        )


# ============================================================
# FRONTEND
# ============================================================

@app.route("/")
def home():

    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


@app.route(
    "/<path:filename>"
)
def frontend_file(filename):

    return send_from_directory(
        FRONTEND_DIR,
        filename
    )


# ============================================================
# HEALTH
# ============================================================

@app.route(
    "/api/health",
    methods=["GET"]
)
def health():

    s3_status = False
    dynamodb_status = False


    try:

        s3.head_bucket(
            Bucket=S3_BUCKET
        )

        s3_status = True

    except Exception as error:

        print(
            "S3 health error:",
            error
        )


    try:

        table.load()

        dynamodb_status = True

    except Exception as error:

        print(
            "DynamoDB health error:",
            error
        )


    healthy = (
        s3_status
        and dynamodb_status
    )


    return jsonify({

        "status":
            "healthy"
            if healthy
            else "unhealthy",

        "region":
            AWS_REGION,

        "s3":
            s3_status,

        "dynamodb":
            dynamodb_status

    })


# ============================================================
# CREATE ITEM
# ============================================================

@app.route(
    "/api/items",
    methods=["POST"]
)
def create_item():

    try:

        item_type = clean(
            request.form.get("type")
        ).lower()

        title = clean(
            request.form.get("title")
        )

        category = clean(
            request.form.get("category")
        )

        color = clean(
            request.form.get("color")
        )

        location = clean(
            request.form.get("location")
        )

        item_date = clean(
            request.form.get("date")
        )

        description = clean(
            request.form.get("description")
        )

        contact_name = clean(
            request.form.get("contactName")
        )

        contact_email = clean(
            request.form.get("contactEmail")
        )

        contact_phone = clean(
            request.form.get("contactPhone")
        )


        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        if item_type not in ITEM_TYPES:

            return jsonify({
                "success": False,
                "message":
                    "Please select a valid item type."
            }), 400


        if not title:

            return jsonify({
                "success": False,
                "message":
                    "Item title is required."
            }), 400


        if not category:

            return jsonify({
                "success": False,
                "message":
                    "Category is required."
            }), 400


        if category not in CATEGORIES:

            return jsonify({
                "success": False,
                "message":
                    "Please select a valid category."
            }), 400


        if not location:

            return jsonify({
                "success": False,
                "message":
                    "Location is required."
            }), 400


        if not item_date:

            return jsonify({
                "success": False,
                "message":
                    "Date is required."
            }), 400


        if not description:

            return jsonify({
                "success": False,
                "message":
                    "Description is required."
            }), 400


        if not contact_name:

            return jsonify({
                "success": False,
                "message":
                    "Contact name is required."
            }), 400


        # ----------------------------------------------------
        # IMAGE
        # ----------------------------------------------------

        uploaded_file = request.files.get(
            "image"
        )

        image_key = None


        if (
            uploaded_file
            and uploaded_file.filename
        ):

            filename = secure_filename(
                uploaded_file.filename
            )


            if not allowed_file(
                filename
            ):

                return jsonify({
                    "success": False,
                    "message":
                        "Only JPG, JPEG, PNG and WEBP images are allowed."
                }), 400


            extension = get_extension(
                filename
            )


            if (
                uploaded_file.mimetype
                and uploaded_file.mimetype
                not in ALLOWED_MIME_TYPES
            ):

                return jsonify({
                    "success": False,
                    "message":
                        "Invalid image type."
                }), 400


            image_key = (
                f"items/"
                f"{uuid.uuid4()}."
                f"{extension}"
            )


            uploaded_file.stream.seek(0)


            s3.upload_fileobj(
                uploaded_file.stream,
                S3_BUCKET,
                image_key,
                ExtraArgs={
                    "ContentType":
                        uploaded_file.mimetype
                        or get_image_content_type(
                            extension
                        )
                }
            )


        # ----------------------------------------------------
        # ITEM
        # ----------------------------------------------------

        item_id = str(
            uuid.uuid4()
        )


        now = datetime.now(
            timezone.utc
        ).isoformat()


        item = {

            "itemId":
                item_id,

            "type":
                item_type,

            "title":
                title,

            "category":
                category,

            "color":
                color,

            "location":
                location,

            "date":
                item_date,

            "description":
                description,

            "contactName":
                contact_name,

            "contactEmail":
                contact_email,

            "contactPhone":
                contact_phone,

            "status":
                "pending",

            "possibleMatch":
                False,

            "createdAt":
                now

        }


        if image_key:

            item["imageKey"] = (
                image_key
            )


        # ----------------------------------------------------
        # MATCH
        # ----------------------------------------------------

        try:

            match_found, _, _ = (
                find_possible_match(
                    item
                )
            )

            item["possibleMatch"] = (
                match_found
            )

        except Exception as error:

            print(
                "Match check failed:",
                error
            )


        # ----------------------------------------------------
        # DYNAMODB
        # ----------------------------------------------------

        table.put_item(
            Item=item
        )


        return jsonify({

            "success":
                True,

            "message":
                "Report submitted successfully! Your report is now waiting for admin approval.",

            "item":
                serialize_item(item)

        }), 201


    except ClientError as error:

        print(
            "AWS error:",
            error
        )


        return jsonify({

            "success":
                False,

            "message":
                "AWS service error while submitting the report."

        }), 500


    except Exception as error:

        print(
            "Create item error:",
            error
        )


        return jsonify({

            "success":
                False,

            "message":
                "Unable to submit the report. Please try again."

        }), 500


# ============================================================
# PUBLIC ITEMS
# ============================================================

@app.route(
    "/api/items",
    methods=["GET"]
)
def get_public_items():

    try:

        response = table.scan()

        items = response.get(
            "Items",
            []
        )


        while "LastEvaluatedKey" in response:

            response = table.scan(
                ExclusiveStartKey=
                response["LastEvaluatedKey"]
            )

            items.extend(
                response.get(
                    "Items",
                    []
                )
            )


        approved_items = [

            serialize_item(item)

            for item in items

            if clean(
                item.get(
                    "status"
                )
            ).lower()
            == "approved"

        ]


        approved_items.sort(
            key=lambda item:
                item.get(
                    "createdAt",
                    ""
                ),
            reverse=True
        )


        return jsonify({

            "success":
                True,

            "items":
                approved_items,

            "count":
                len(
                    approved_items
                )

        })


    except Exception as error:

        print(
            "Public items error:",
            error
        )


        return jsonify({

            "success":
                False,

            "message":
                "Unable to load items."

        }), 500


# ============================================================
# SINGLE ITEM
# ============================================================

@app.route(
    "/api/items/<item_id>",
    methods=["GET"]
)
def get_item(item_id):

    try:

        response = table.get_item(
            Key={
                "itemId":
                    item_id
            }
        )


        item = response.get(
            "Item"
        )


        if not item:

            return jsonify({
                "success": False,
                "message":
                    "Item not found."
            }), 404


        if clean(
            item.get("status")
        ).lower() != "approved":

            return jsonify({
                "success": False,
                "message":
                    "Item not found."
            }), 404


        return jsonify({

            "success":
                True,

            "item":
                serialize_item(item)

        })


    except Exception as error:

        print(
            "Get item error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to load item."
        }), 500


# ============================================================
# MATCHES
# ============================================================

@app.route(
    "/api/items/<item_id>/matches",
    methods=["GET"]
)
def get_item_matches(item_id):

    try:

        response = table.get_item(
            Key={
                "itemId":
                    item_id
            }
        )


        item = response.get(
            "Item"
        )


        if not item:

            return jsonify({
                "success": False,
                "message":
                    "Item not found."
            }), 404


        response = table.scan()

        all_items = response.get(
            "Items",
            []
        )


        while "LastEvaluatedKey" in response:

            response = table.scan(
                ExclusiveStartKey=
                response["LastEvaluatedKey"]
            )

            all_items.extend(
                response.get(
                    "Items",
                    []
                )
            )


        matches = []


        for candidate in all_items:

            if candidate.get(
                "itemId"
            ) == item_id:
                continue


            if clean(
                candidate.get(
                    "status"
                )
            ).lower() != "approved":
                continue


            score = calculate_match_score(
                item,
                candidate
            )


            if score >= 2:

                match = serialize_item(
                    candidate
                )

                match["matchScore"] = (
                    score
                )

                matches.append(
                    match
                )


        matches.sort(
            key=lambda x:
                x.get(
                    "matchScore",
                    0
                ),
            reverse=True
        )


        return jsonify({

            "success":
                True,

            "matches":
                matches

        })


    except Exception as error:

        print(
            "Matches error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to find possible matches."
        }), 500


# ============================================================
# ADMIN ITEMS
# ============================================================

@app.route(
    "/api/admin/items",
    methods=["GET"]
)
def admin_get_items():

    if not admin_authorized():

        return admin_required_response()


    try:

        response = table.scan()

        items = response.get(
            "Items",
            []
        )


        while "LastEvaluatedKey" in response:

            response = table.scan(
                ExclusiveStartKey=
                response["LastEvaluatedKey"]
            )

            items.extend(
                response.get(
                    "Items",
                    []
                )
            )


        serialized = [

            serialize_item(item)

            for item in items

        ]


        serialized.sort(
            key=lambda item:
                item.get(
                    "createdAt",
                    ""
                ),
            reverse=True
        )


        return jsonify({

            "success":
                True,

            "items":
                serialized,

            "count":
                len(serialized)

        })


    except Exception as error:

        print(
            "Admin items error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to load admin items."
        }), 500


# ============================================================
# ADMIN STATS
# ============================================================

@app.route(
    "/api/admin/stats",
    methods=["GET"]
)
def admin_stats():

    if not admin_authorized():

        return admin_required_response()


    try:

        response = table.scan()

        items = response.get(
            "Items",
            []
        )


        while "LastEvaluatedKey" in response:

            response = table.scan(
                ExclusiveStartKey=
                response["LastEvaluatedKey"]
            )

            items.extend(
                response.get(
                    "Items",
                    []
                )
            )


        return jsonify({

            "success":
                True,

            "stats": {

                "total":
                    len(items),

                "pending":
                    sum(
                        1
                        for item in items
                        if clean(
                            item.get(
                                "status"
                            )
                        ).lower()
                        == "pending"
                    ),

                "approved":
                    sum(
                        1
                        for item in items
                        if clean(
                            item.get(
                                "status"
                            )
                        ).lower()
                        == "approved"
                    ),

                "rejected":
                    sum(
                        1
                        for item in items
                        if clean(
                            item.get(
                                "status"
                            )
                        ).lower()
                        == "rejected"
                    )

            }

        })


    except Exception as error:

        print(
            "Admin stats error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to load statistics."
        }), 500


# ============================================================
# ADMIN APPROVE
# ============================================================

@app.route(
    "/api/admin/items/<item_id>/approve",
    methods=["PUT"]
)
def admin_approve_item(item_id):

    if not admin_authorized():

        return admin_required_response()


    try:

        response = table.get_item(
            Key={
                "itemId":
                    item_id
            }
        )


        if not response.get("Item"):

            return jsonify({
                "success": False,
                "message":
                    "Item not found."
            }), 404


        table.update_item(

            Key={
                "itemId":
                    item_id
            },

            UpdateExpression=
                "SET #status = :status",

            ExpressionAttributeNames={
                "#status":
                    "status"
            },

            ExpressionAttributeValues={
                ":status":
                    "approved"
            }

        )


        return jsonify({
            "success": True,
            "message":
                "Item approved successfully."
        })


    except Exception as error:

        print(
            "Approve error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to approve item."
        }), 500


# ============================================================
# ADMIN REJECT
# ============================================================

@app.route(
    "/api/admin/items/<item_id>/reject",
    methods=["PUT"]
)
def admin_reject_item(item_id):

    if not admin_authorized():

        return admin_required_response()


    try:

        response = table.get_item(
            Key={
                "itemId":
                    item_id
            }
        )


        if not response.get("Item"):

            return jsonify({
                "success": False,
                "message":
                    "Item not found."
            }), 404


        table.update_item(

            Key={
                "itemId":
                    item_id
            },

            UpdateExpression=
                "SET #status = :status",

            ExpressionAttributeNames={
                "#status":
                    "status"
            },

            ExpressionAttributeValues={
                ":status":
                    "rejected"
            }

        )


        return jsonify({
            "success": True,
            "message":
                "Item rejected successfully."
        })


    except Exception as error:

        print(
            "Reject error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to reject item."
        }), 500


# ============================================================
# ADMIN DELETE
# ============================================================

@app.route(
    "/api/admin/items/<item_id>",
    methods=["DELETE"]
)
def admin_delete_item(item_id):

    if not admin_authorized():

        return admin_required_response()


    try:

        response = table.get_item(
            Key={
                "itemId":
                    item_id
            }
        )


        item = response.get(
            "Item"
        )


        if not item:

            return jsonify({
                "success": False,
                "message":
                    "Item not found."
            }), 404


        image_key = item.get(
            "imageKey"
        )


        if image_key:

            try:

                s3.delete_object(
                    Bucket=S3_BUCKET,
                    Key=image_key
                )

            except Exception as error:

                print(
                    "S3 delete warning:",
                    error
                )


        table.delete_item(
            Key={
                "itemId":
                    item_id
            }
        )


        return jsonify({
            "success": True,
            "message":
                "Item deleted successfully."
        })


    except Exception as error:

        print(
            "Delete error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to delete item."
        }), 500


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(413)
def file_too_large(error):

    return jsonify({
        "success": False,
        "message":
            "Uploaded image is too large. Maximum size is 5 MB."
    }), 413


@app.errorhandler(404)
def not_found(error):

    if request.path.startswith(
        "/api/"
    ):

        return jsonify({
            "success": False,
            "message":
                "API endpoint not found."
        }), 404


    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


@app.errorhandler(500)
def internal_error(error):

    return jsonify({
        "success": False,
        "message":
            "Internal server error."
    }), 500


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("CLOUDCRAFT LOST & FOUND PORTAL")
    print("=" * 60)

    print(
        f"AWS Region      : {AWS_REGION}"
    )

    print(
        f"S3 Bucket       : {S3_BUCKET}"
    )

    print(
        f"DynamoDB Table  : {DYNAMODB_TABLE}"
    )

    print(
        "Server          : http://127.0.0.1:8000"
    )

    print("=" * 60)
    print()


    app.run(
        host="0.0.0.0",
        port=8000,
        debug=True
    )