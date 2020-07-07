# # Mongo test db data

Dump your functional test db here when schema gets updated

    mongodump -db functest -o test/fixture/mongo_test_data

You may want to get alerts/alertoccurrences from you main db

    mongodump -db oa --collection alerts --out test/fixture/mongo_test_data
    mongodump -db oa --collection  alertoccurrences --out test/fixture/mongo_test_data
    mv test/fixture/mongo_test_data/oa/* test/fixture/mongo_test_data/functest
    rmdir test/fixture/mongo_test_data/oa

Restore

    mongorestore --drop test/fixture/mongo_test_data/

The restore will warn about this README file, ignore it
