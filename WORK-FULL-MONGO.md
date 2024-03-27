# TASKLIST to provide a Full-Mongo distribution

### Remove 'sqlite' from

- [x] [platform/DB](https://github.com/pryv/open-pryv.io/blob/full-mongo/components/platform/src/) which contains all unique and indexed field. This DB should be distributed among servers
- [ ] [userLocalDir](https://github.com/pryv/open-pryv.io/blob/full-mongo/components/storage/src/userLocalDirectory.js) map userId / userName
- [ ] [userAccountStorage](https://github.com/pryv/open-pryv.io/full-mongo/master/components/storage/src/userAccountStorage.js) contains password and password history

Task is completed when a script to migrate is provided and settings to activate. 

### Move Attachments to an online storage

- GridFS ? // S3 ??

### (Optional) Put all config in MongoDB

## Log

27/03/2024 - Made a MongoDB of platform/DB 

- can be actiavted with setting `platform:db = 'mongodb'`
- migration with `LOGS=info node components/platform/src/switch1.9.0sqlite-mongo.js --config configs/api.yml`

