// import fs for reading file
const fs = require("fs");

// require csv to json
const csv = require("csvtojson");

// require mysql connector
const mysql = require("mysql");

// require loader
const loader = require("./loading.js");

// Make an array of id author relation
var author_id_ = {};

// connect mysql server
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "import_test",
});

(async () => {
  path = "./authors.json";

  fs.access(path, err => {
    if (err);
    else {
      console.log(
        "author.json already exists in folder, Make sure to clear database and delete current file."
      );
      process.exit();
    }
  });

  console.log("\n\nImporting Authors \n\n");
  // Do connection with mysql
  connection.connect();
  var bar = loader.bar;
  // read a csv file
  var authors = await csv().fromFile("./NYSun Authors List.csv");

  total = authors.length;
  elapsed = 0;
  // console.log(authors);
  for (let obj in authors) {
    article_val_key = InsertKeyValue(authors[obj], "authors");
    // console.log(article_val_key);
    try {
      author_id = (await InsertArticle(article_val_key)).insertId;
      if (author_id) {
        elapsed++;
        author_id_[authors[obj]["Author"]] = {
          id: author_id,
          category: authors[obj]["Section"]
            ? authors[obj]["Section"]
            : "National",
        };

        bar.proceed(Math.floor((elapsed * 100) / total));
      }
    } catch (error) {
      if (error) {
        fs.appendFile(
          "./errors/author_import.txt",
          JSON.stringify(error),
          err => {
            if (err) {
              throw err;
            }
          }
        );
      }
    }
  }

  fs.writeFile("./authors.json", JSON.stringify(author_id_), err => {
    if (err) {
      console.error(err);
      return;
    }

    bar.complete();

    console.log("\n\n\nProcess Completed. Exiting..");
    process.exit();
    //file written successfully
  });
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
    values += '"' + insert_values[i] + '"';
    if (i != insert_values.length - 1) {
      values += ",";
    }
  }
  values += ")";

  return col + values;
}

// Apply filter to process table data
function ApplyFilter(data, type) {
  if (type == "authors") {
    return {
      post_author: 1,
      post_date: data["post_date"]
        ? data["post_date"]
        : new Date().toISOString(),
      post_date_gmt: data["post_date_gmt"]
        ? data["post_date_gmt"]
        : new Date().toISOString(),
      post_content: data["post_content"] ? data["post_content"] : "",
      post_title: data["Author"]
        ? data["Author"].split('"').join("'")
        : "Default Title",
      post_excerpt: data["post_excerpt"]
        ? data["post_excerpt"]
        : "Author of nys",
      post_status: data["post_status"] ? data["post_status"] : "publish",
      comment_status: "open",
      ping_status: "open",
      post_password: "",
      post_name: data.Author.toLowerCase()
        .split(" ")
        .join("-")
        .split('"')
        .join("'"),
      to_ping: "",
      pinged: "",
      post_modified: new Date().toISOString(),
      post_modified_gmt: new Date().toISOString(),
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
