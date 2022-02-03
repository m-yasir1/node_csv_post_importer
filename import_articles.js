// import fs for reading file
const fs = require("fs");

// require csv to json
const csv = require("csvtojson");

// require mysql connector
const mysql = require("mysql");

// require loader
const loader = require("./loading.js");

// import authorsv data
var authors = require("./authors.json");

if (!authors) {
  console.log("Exiting, Authors data doesnot exits");
  process.exit();
}

// connect mysql server
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "import_test",
});

const images = [
  "https://www.dropbox.com/sh/j24ler7a98wjf74/AADpFIGXpTn7bi2i7iJRENtoa?dl=0&preview=nys-featured-image-1D.png",
  "https://www.dropbox.com/sh/j24ler7a98wjf74/AADpFIGXpTn7bi2i7iJRENtoa?dl=0&preview=nys-featured-image-1B.png",
  "https://www.dropbox.com/sh/j24ler7a98wjf74/AADpFIGXpTn7bi2i7iJRENtoa?dl=0&preview=nys-featured-image-1A.png",
];

(async () => {
  // Do connection with mysql
  connection.connect();
  console.log("\n\n Importing Articles");
  var bar = loader.bar;

  var cat_list = await fetch_cat();

  // read a csv file
  var articles = await csv().fromFile("./nysun-articles-table copy.csv");

  var total = articles.length;

  var elapsed = 0;

  for (let obj in articles) {
    if (articles[obj]["status"] != "1") {
      elapsed++;
      continue;
    }

    article_val_key = InsertKeyValue(articles[obj], "articles");
    articles[obj]["featured_image"] = images[Math.floor(Math.random() * 3)];
    image_val_key = InsertKeyValue(articles[obj], "attachment");
    try {
      article_id = (await InsertArticle(article_val_key)).insertId;

      image_id = (await InsertArticle(image_val_key)).insertId;

      InsertMeta(article_id, "_thumbnail_id", image_id);

      author = authors[articles[obj]["author"]];

      if (author) {
        InsertMeta(article_id, "author", author.id);
      }

      let term = fetch_term(cat_list, author);

      term_relation(term, article_id);

      elapsed++;

      bar.proceed(Math.floor((elapsed * 100) / total));
    } catch (error) {
      if (error) {
        elapsed++;
        bar.proceed(Math.floor((elapsed * 100) / total));
        fs.appendFile(
          "./errors/article_import.txt",
          JSON.stringify(error) + "\n",
          err => {
            if (err) {
              throw err;
            }
          }
        );
      }
    }
  }
  bar.complete();
  console.log("\n\n\nProcess Completed. Exiting..");
  process.exit();
})();

// Fetch Category lists
async function fetch_cat() {
  let query =
    "SELECT * FROM wp_terms as wt INNER JOIN wp_term_taxonomy as tt ON wt.term_id = tt.term_id WHERE tt.taxonomy = 'category'";

  let p = new Promise((res, rej) => {
    connection.query(query, (err, result, f) => {
      if (err) {
        console.log("Cannot fetch categories from DB");
        process.exit();
      }
      res(result);
    });
  });
  return p;
}

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
    values += mysql.escape(insert_values[i]);
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
      post_date: data["date_posted"] ? data["date_posted"] : new Date(),
      post_date_gmt: data["date_posted"]
        ? data["date_posted"]
        : new Date().getUTCDate(),
      post_content: data["content"] ? data["content"] : "Default Content",
      post_title: data["title"] ? data["title"] : "Default Title",
      post_excerpt: data["excerpt_paras"]
        ? data["excerpt_paras"]
        : "Default Excerpt",
      post_status: data["post_status"] ? data["post_status"] : "publish",
      comment_status: "open",
      ping_status: "open",
      post_password: "",
      post_name: data["filename"]
        ? data["filename"].split("/").join("-")
        : data["excerpt_meta"]?.toLowerCase().split(" ").join("-"),
      to_ping: "",
      pinged: "",
      post_modified: new Date(),
      post_modified_gmt: new Date(),
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

// Add term relation
function term_relation(term_id, post_id) {
  let query = `INSERT INTO wp_term_relationships (object_id, term_taxonomy_id, term_order) VALUES(${post_id}, ${term_id}, 0)`;

  let promise = new Promise((res, rej) => {
    connection.query(query, (e, r) => {
      if (e) rej(e);
      res(r);
    });
  });
  return promise;
}

// Return term id based on post and author
function fetch_term(list, author) {
  let section = "";
  if (author) {
    section = author.category;
  }
  section = section != "" ? section : "National";

  let obj = list.find(val => {
    if (section == "Opinion") {
      return val.name == "Opinion (Other)";
    } else return val.name == section;
  });

  return obj.term_id;
}
