-- Test advanced SQL functionality
CREATE TABLE test_table (
    id INT PRIMARY KEY,
    name VARCHAR(100)
);

INSERT INTO test_table VALUES (1, 'Alice'), (2, 'Bob');

SELECT * FROM test_table;
