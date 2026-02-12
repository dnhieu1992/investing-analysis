import mysql from "mysql2/promise";

const globalForMysql = globalThis as unknown as {
  mysqlPool: mysql.Pool | undefined;
};

export const pool =
  globalForMysql.mysqlPool ??
  mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT ?? 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || undefined,
    connectionLimit: 10,
    enableKeepAlive: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalForMysql.mysqlPool = pool;
}
