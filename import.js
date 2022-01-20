// import fs for reading file
const fs = require("fs");

// require csv to json
const csv = require("csvtojson");

// require mysql connector
const mysql = require("mysql");

// connect mysql server
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "import_test",
});

(async () => {
  // Do connection with mysql
  connection.connect();

  // read a csv file
  const articles = await csv().fromFile("./Post-csv-sample.csv");

  for (let obj in articles) {
    article_val_key = InsertKeyValue(articles[obj], "articles");
    image_val_key = InsertKeyValue(articles[obj], "attachment");
    try {
      article_id = (await InsertArticle(article_val_key)).insertId;
      //   console.log(article_id);

      image_id = (await InsertArticle(image_val_key)).insertId;
      //   console.log(image_id);

      InsertMeta(article_id, "_thumbnail_id", image_id);
    } catch (error) {
      console.log(error);
    }
  }
})();

// Insert article in table
async function InsertArticle(val_key) {
  let query = "INSERT INTO wp_posts " + val_key;

  let promise = new Promise((res, rej) => {
    connection.query(query, (e, r) => {
      if (e) rej(e);
      res(r);
    });
  });
  return promise;
}

// Insert Meta Data
async function InsertMeta(article, key, val) {
  let query = `INSERT INTO wp_postmeta (post_id, meta_key, meta_value) VALUES('${article}', '${key}', '${val}')`;

  let promise = new Promise((res, rej) => {
    connection.query(query, (e, r) => {
      if (e) rej(e);
      res(r);
    });
  });
  return promise;
}

// Add a attachment type post function
async function AddAttachment(guid) {}

// Generate insert query data
function InsertKeyValue(data, type) {
  data = ApplyFilter(data, type);
  insert_columns = [];
  insert_values = [];
  if (data) {
    for (let key in data) {
      insert_columns.push(key);
      insert_values.push(data[key]);
    }
  }

  var col = "(";
  for (var i = 0; i < insert_columns.length; i++) {
    col += insert_columns[i];
    if (i != insert_columns.length - 1) {
      col += ",";
    }
  }
  col += ") VALUES ";
  values = "(";
  for (var i = 0; i < insert_values.length; i++) {
    values += "'" + insert_values[i] + "'";
    if (i != insert_values.length - 1) {
      values += ",";
    }
  }
  values += ")";

  return col + values;
}

// Apply filter to process table data
function ApplyFilter(data, type) {
  if (type == "articles" || type == "attachment") {
    return {
      post_author: 1,
      post_date: data["post_date"]
        ? data["post_date"]
        : new Date().getUTCDate(),
      post_date_gmt: data["post_date_gmt"]
        ? data["post_date_gmt"]
        : new Date().getUTCDate(),
      post_content: data["post_content"]
        ? data["post_content"]
        : "Default Content",
      post_title: data["post_title"] ? data["post_title"] : "Default Title",
      post_excerpt: data["post_excerpt"]
        ? data["post_excerpt"]
        : "Default Excerpt",
      post_status: data["post_status"] ? data["post_status"] : "publish",
      comment_status: "open",
      ping_status: "open",
      post_password: "",
      post_name: "post_name",
      to_ping: "",
      pinged: "",
      post_modified: new Date().getUTCDate(),
      post_modified_gmt: new Date().getUTCDate(),
      post_content_filtered: "",
      post_parent: 0,
      guid: (() => {
        if (data["guid"] && type == "articles") return data["guid"];
        else if (data["featured_image"] && type == "attachment")
          return data["featured_image"];
        else return "";
      })(),
      menu_order: 0,
      post_type: type,
      post_mime_type: "",
      comment_count: 0,
    };
  }
}
