function createCloudinaryStorage(cloudinary) {
    const options = {
        folder: 'civicconnect/complaints',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
    };

    return {
        _handleFile(_req, file, callback) {
            let completed = false;
            const finish = (error, info) => {
                if (completed) return;
                completed = true;
                callback(error, info);
            };
            const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
                if (error) return finish(error);
                if (!result?.secure_url || !result.public_id) return finish(new Error('Cloudinary returned an incomplete upload result.'));
                finish(null, { path: result.secure_url, filename: result.public_id, size: result.bytes, mimetype: file.mimetype });
            });
            file.stream.once('error', finish);
            stream.once('error', finish);
            file.stream.pipe(stream);
        },
        _removeFile(_req, file, callback) {
            if (!file.filename) return callback(null);
            cloudinary.uploader.destroy(file.filename, { resource_type: 'image' }).then(() => callback(null), callback);
        },
    };
}

module.exports = { createCloudinaryStorage };
