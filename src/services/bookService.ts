import * as fs from "fs";
import { ethers } from "ethers";
import { isFilled, isUsable } from "../utils/functions";
import axios from "axios";
import {
  customPath,
  dirPath,
  GENRES,
  genresPath,
  langPath,
  LANGUAGES,
  marketplaceContract,
  NALNDA_SERVER_URL,
  QUEUES,
  temPath,
  UserState,
} from "../utils/constant";
import { bookDownload } from "../utils/bookDownload";
import FormData from "form-data";
import moment from "moment";
import { rabbitMqClient } from "../jobs/rabbitMq";

const booksAddServices = async () => {
  const folders = await fs.promises.readdir(dirPath);
  let booksArray = [];
  let count = 0;

  for (const folder of folders) {
    if (
      fs.lstatSync(`${dirPath}/${folder}`).isDirectory() &&
      isUsable(parseInt(folder))
    ) {
      if (fs.lstatSync(`${dirPath}/${folder}/pg${folder}.json`).isFile()) {
        let bookFile = null;
        try {
          bookFile = require(`../data/epub/${folder}/pg${folder}.json`);
        } catch (error) {
          console.error({
            message: "Error opening JSON",
            error: error,
          });
        }
        if (isUsable(bookFile)) {
          count += 1;
          booksArray.push(bookFile);
          console.log(count);
          if (!(booksArray.length % 100) || count === folders.length) {
            await processToGetBooksInfo({ bookFiles: booksArray });
            // console.log(booksArray);
            booksArray = [];
          }
        }
      }
    }
  }
};

const processToGetBookInfo = async ({ bookFile }) => {
  const book = {
    bookshelf:
      typeof bookFile.RDF.ebook.bookshelf === "object"
        ? isUsable(bookFile.RDF.ebook.bookshelf.length)
          ? bookFile.RDF.ebook.bookshelf.map(
              (bookshelf) => bookshelf.Description.value
            )
          : [bookFile.RDF.ebook.bookshelf.Description.value]
        : [],
    creator: bookFile.RDF.ebook.creator?.agent?.name,
    description: bookFile.RDF.ebook.description,
    downloads: bookFile.RDF.ebook.downloads["#text"],
    covers: isUsable(bookFile.RDF.ebook.hasFormat.length)
      ? bookFile.RDF.ebook.hasFormat
          .filter((format) =>
            format.file["@_about"].includes("cover.medium")
              ? true
              : format.file["@_about"].includes("cover.small")
              ? true
              : false
          )
          .map((format) => format.file["@_about"])
      : bookFile.RDF.ebook.hasFormat.file["@_about"].includes("cover")
      ? bookFile.RDF.ebook.hasFormat.file["@_about"]
      : null,
    files: isUsable(bookFile.RDF.ebook.hasFormat.length)
      ? bookFile.RDF.ebook.hasFormat
          .filter((format) =>
            format.file["@_about"].includes("epub.noimages")
              ? true
              : format.file["@_about"].includes("epub3.images")
              ? true
              : format.file["@_about"].includes("epub.images")
              ? true
              : false
          )
          .map((format) => format.file["@_about"])
      : bookFile.RDF.ebook.hasFormat.file["@_about"].includes("epub.noimages")
      ? bookFile.RDF.ebook.hasFormat.file["@_about"]
      : bookFile.RDF.ebook.hasFormat.file["@_about"].includes("epub3.images")
      ? bookFile.RDF.ebook.hasFormat.file["@_about"]
      : bookFile.RDF.ebook.hasFormat.file["@_about"].includes("epub.images")
      ? bookFile.RDF.ebook.hasFormat.file["@_about"]
      : null,
    issued: bookFile.RDF.ebook.issued,
    language: bookFile.RDF.ebook.language?.Description?.value["#text"],
    publisher: bookFile.RDF.ebook.publisher,
    title: bookFile.RDF.ebook.title,
  };

  if (isFilled(book.covers) && isFilled(book.files)) {
    const coverUrl = book.covers[0];
    const fileUrl = book.files[1];
    const coverFileName = `${
      book.title.length > 64 ? book.title.slice(0, 64) : book.title
    }${coverUrl?.slice(coverUrl.lastIndexOf("."), coverUrl.length)}`;
    const bookFileName = `${
      book.title.length > 64 ? book.title.slice(0, 64) : book.title
    }.epub`;

    if (isUsable(coverFileName) && isUsable(bookFileName)) {
      await bookCoverDownload({ coverUrl, coverFileName });
      const downloadBook = await bookDownload({ fileUrl, bookFileName });
      if (downloadBook) {
        const readableStreamForBook = fs.createReadStream(
          `${temPath}/${bookFileName}`
        );
        const readableStreamForCover = fs.createReadStream(
          `${temPath}/${coverFileName}`
        );

        let formData = new FormData();
        formData.append("book", readableStreamForBook);
        formData.append("cover", readableStreamForCover);

        const submarineResponse = await axios.post(
          `${NALNDA_SERVER_URL}/api/book/submarine`,
          formData,
          {
            headers: {
              "user-id": UserState.user.uid,
              address: UserState.user.wallet,
              authorization: `Bearer ${UserState.tokens.acsTkn.tkn}`,
              ...formData.getHeaders(),
            },
          }
        );

        if (submarineResponse.status === 200) {
          const bookUrl = submarineResponse.data.book.url;
          const coverUrl = submarineResponse.data.cover.url;
          const secondaryFromInDays = Math.round(
            moment.duration(moment().add(1, "days").diff(moment())).asDays()
          );
          const price = "5";
          console.log({ bookUrl });
          console.log({ coverUrl });
          console.log({ secondaryFromInDays });

          if (!LANGUAGES.includes(book.language)) {
            LANGUAGES.push(book.language);
            fs.appendFile(langPath, `"${book.language}",\n`, (err) => {
              if (err)
                console.error({
                  message: "Language File Error",
                  error: err,
                  value: book.language,
                });
              else console.log("Language added");
            });
          }

          book.bookshelf.forEach((bookGenre) => {
            if (!GENRES.includes(bookGenre)) {
              GENRES.push(bookGenre);
              fs.appendFile(genresPath, `"${bookGenre}",\n`, (err) => {
                if (err)
                  console.error({
                    message: "Genre File Error",
                    error: err,
                    value: bookGenre,
                  });
                else console.log("Genre added");
              });
            }
          });

          const language = book.language;
          const genres = book.bookshelf;
          console.log("starting txn");

          // console.log(count, typeof count, count);
          let transaction = await marketplaceContract.createNewBook(
            UserState.user.wallet,
            coverUrl,
            ethers.utils.parseEther(price),
            // secondaryFromInDays,
            91,
            // LANGUAGES.indexOf(language),
            1,
            // genres.map((genre) => GENRES.indexOf(genre))
            [1, 2, 5]
          );

          console.log(book, "books updated");
          let tx = await transaction.wait();
          console.log({ tx });
          await bookUploadToDatabase({
            book: book,
            tx: tx,
            bookFileName: bookFileName,
            coverUrl: coverUrl,
            coverFileName: coverFileName,
            bookUrl: bookUrl,
            genres: genres,
            price: price,
            language: language,
            secondaryFromInDays: secondaryFromInDays,
          });
        }
      }
    }
  }
};

const processToGetBooksInfo = async ({ bookFiles }) => {
  let books = {
    _author: [],
    _coverURI: [],
    _initialPrice: [],
    _daysForSecondarySales: [],
    _lang: [],
    _genre: [],
  };
  for (const bookFile of bookFiles) {
    const book = {
      bookshelf:
        typeof bookFile.RDF.ebook.bookshelf === "object"
          ? isUsable(bookFile.RDF.ebook.bookshelf.length)
            ? bookFile.RDF.ebook.bookshelf.map(
                (bookshelf) => bookshelf.Description.value
              )
            : [bookFile.RDF.ebook.bookshelf.Description.value]
          : [],
      creator: bookFile.RDF.ebook.creator?.agent?.name,
      description: bookFile.RDF.ebook.description,
      downloads: bookFile.RDF.ebook.downloads["#text"],
      covers: isUsable(bookFile.RDF.ebook.hasFormat.length)
        ? bookFile.RDF.ebook.hasFormat
            .filter((format) =>
              format.file["@_about"].includes("cover.medium")
                ? true
                : format.file["@_about"].includes("cover.small")
                ? true
                : false
            )
            .map((format) => format.file["@_about"])
        : bookFile.RDF.ebook.hasFormat.file["@_about"].includes("cover")
        ? bookFile.RDF.ebook.hasFormat.file["@_about"]
        : null,
      files: isUsable(bookFile.RDF.ebook.hasFormat.length)
        ? bookFile.RDF.ebook.hasFormat
            .filter((format) =>
              format.file["@_about"].includes("epub.noimages")
                ? true
                : format.file["@_about"].includes("epub3.images")
                ? true
                : format.file["@_about"].includes("epub.images")
                ? true
                : false
            )
            .map((format) => format.file["@_about"])
        : bookFile.RDF.ebook.hasFormat.file["@_about"].includes("epub.noimages")
        ? bookFile.RDF.ebook.hasFormat.file["@_about"]
        : bookFile.RDF.ebook.hasFormat.file["@_about"].includes("epub3.images")
        ? bookFile.RDF.ebook.hasFormat.file["@_about"]
        : bookFile.RDF.ebook.hasFormat.file["@_about"].includes("epub.images")
        ? bookFile.RDF.ebook.hasFormat.file["@_about"]
        : null,
      issued: bookFile.RDF.ebook.issued,
      language: bookFile.RDF.ebook.language?.Description?.value["#text"],
      publisher: bookFile.RDF.ebook.publisher,
      title: bookFile.RDF.ebook.title,
    };

    try {
      if (isFilled(book.covers) && isFilled(book.files)) {
        const coverUrl = book.covers[0];
        const fileUrl = book.files[1];
        const coverFileName = `${
          book.title.length > 64 ? book.title.slice(0, 64) : book.title
        }${coverUrl?.slice(coverUrl.lastIndexOf("."), coverUrl.length)}`;
        const bookFileName = `${
          book.title.length > 64 ? book.title.slice(0, 64) : book.title
        }.epub`;

        if (isUsable(coverFileName) && isUsable(bookFileName)) {
          await bookCoverDownload({ coverUrl, coverFileName });
          const downloadBook = await bookDownload({ fileUrl, bookFileName });
          if (downloadBook) {
            const readableStreamForBook = fs.createReadStream(
              `${temPath}/${bookFileName}`
            );
            const readableStreamForCover = fs.createReadStream(
              `${temPath}/${coverFileName}`
            );

            let formData = new FormData();
            formData.append("book", readableStreamForBook);
            formData.append("cover", readableStreamForCover);

            const submarineResponse = await axios.post(
              `${NALNDA_SERVER_URL}/api/book/submarine`,
              formData,
              {
                headers: {
                  "user-id": UserState.user.uid,
                  address: UserState.user.wallet,
                  authorization: `Bearer ${UserState.tokens.acsTkn.tkn}`,
                  ...formData.getHeaders(),
                },
              }
            );

            if (submarineResponse.status === 200) {
              const bookUrl = submarineResponse.data.book.url;
              const coverUrl = submarineResponse.data.cover.url;
              const secondaryFromInDays = Math.round(
                moment.duration(moment().add(1, "days").diff(moment())).asDays()
              );
              const price = "5";
              console.log({ bookUrl });
              console.log({ coverUrl });
              console.log({ secondaryFromInDays });

              if (!LANGUAGES.includes(book.language)) {
                LANGUAGES.push(book.language);
                fs.appendFile(langPath, `"${book.language}",\n`, (err) => {
                  if (err)
                    console.error({
                      message: "Language File Error",
                      error: err,
                      value: book.language,
                    });
                  else console.log("Language added");
                });
              }

              book.bookshelf.forEach((bookGenre) => {
                if (!GENRES.includes(bookGenre)) {
                  GENRES.push(bookGenre);
                  fs.appendFile(genresPath, `"${bookGenre}",\n`, (err) => {
                    if (err)
                      console.error({
                        message: "Genre File Error",
                        error: err,
                        value: bookGenre,
                      });
                    else console.log("Genre added");
                  });
                }
              });

              const language = book.language;
              const genres = book.bookshelf;
              console.log("starting txn");

              books._author.push(UserState.user.wallet);
              books._coverURI.push(coverUrl);
              books._initialPrice.push(ethers.utils.parseEther(price));
              books._daysForSecondarySales.push(91);
              books._lang.push(1);
              books._genre.push([1, 2, 5]);
              // console.log(count, typeof count, count);
            }
          }
        }
      }
    } catch (error) {
      console.error("Genre File Error", error);
    }
  }

  let transaction = await marketplaceContract.createNewBooks(
    books._author,
    books._coverURI,
    books._initialPrice,
    books._daysForSecondarySales,
    books._lang,
    books._genre
  );

  let tx = await transaction.wait();
  console.log({ tx });
  // await bookUploadToDatabase({
  //   book: book,
  //   tx: tx,
  //   bookFileName: bookFileName,
  //   coverUrl: coverUrl,
  //   coverFileName: coverFileName,
  //   bookUrl: bookUrl,
  //   genres: genres,
  //   price: price,
  //   language: language,
  //   secondaryFromInDays: secondaryFromInDays,
  // });
  console.log(books, "books");
};

// Book Cover Download and store the temporary folder
const bookCoverDownload = async ({ coverFileName, coverUrl }) => {
  try {
    const response = await axios({
      url: coverUrl,
      method: "GET",
      responseType: "stream",
    });

    const coverDownload = fs.createWriteStream(`${temPath}/${coverFileName}`);
    response.data.pipe(coverDownload);

    return new Promise((resolve, reject) => {
      coverDownload.on("finish", resolve);
      coverDownload.on("error", reject);
    });
  } catch (error) {}
};

// Book upload in the database
const bookUploadToDatabase = async ({
  book,
  tx,
  bookFileName,
  coverUrl,
  coverFileName,
  bookUrl,
  genres,
  price,
  language,
  secondaryFromInDays,
}) => {
  const bookAddress = tx.events.filter(
    (event) => event["event"] === "OwnershipTransferred"
  )[0].address;
  const status = tx.status;
  const txHash = tx.transactionHash;
  console.log({ creator: book.creator });
  if (
    isUsable(bookAddress) &&
    isUsable(status) &&
    status === 1 &&
    isUsable(txHash)
  ) {
    let formData = new FormData();
    formData.append(
      "epub",
      fs.createReadStream(customPath(`../temp/${bookFileName}`))
    );
    formData.append("name", book?.title ?? "UNKNOWN");
    formData.append("author", book?.creator ?? "UNKNOWN");
    formData.append("cover", coverUrl);
    formData.append(
      "coverFile",
      fs.createReadStream(`./temp/${coverFileName}`)
    );
    formData.append("book", bookUrl);
    formData.append("genres", JSON.stringify(genres));
    formData.append("ageGroup", JSON.stringify([]));
    formData.append("price", price);
    formData.append("pages", 500);
    formData.append("publication", book?.publisher ?? "UNKNOWN");
    formData.append(
      "synopsis",
      // synopsis.replace(/<[^>]+>/g,'')
      ""
    );
    formData.append("language", language);
    formData.append("published", moment().format("YYYY-MM-DD"));
    formData.append("secondarySalesFrom", secondaryFromInDays);
    formData.append("publisherAddress", UserState.user.wallet);
    formData.append("bookAddress", bookAddress);
    formData.append("txHash", txHash);

    rabbitMqClient.sendCreateBookTransactionDataToQueue(
      QUEUES.BOOK_BATCH_PROCESSING_QUEUE,
      JSON.stringify({
        formData,
      })
    );
    // await axios({
    //   url: NALNDA_SERVER_URL + "/api/book/publish",
    //   method: "POST",
    //   headers: {
    //     ...formData.getHeaders(),
    //   },
    //   data: formData,
    // })
    //   .then((res4) => {
    //     if (res4.status === 200) {
    //       console.log({
    //         message: "book published",
    //         book: {
    //           title: book.title,
    //           address: bookAddress,
    //           txnHash: txHash,
    //         },
    //       });
    //     } else {
    //       console.error({
    //         message: "WEB2 Publish Error",
    //       });
    //     }
    //   })
    //   .catch((err) => {
    //     if (isUsable(err.response)) {
    //       if (err.response.status === 413)
    //         console.error({
    //           message: "WEB2 Publish Error",
    //           error: "FILE LIMIT ERROR",
    //         });
    //       else if (err.response.status === 415)
    //         console.error({
    //           message: "WEB2 Publish Error",
    //           error: "INVALID FILE TYPE ERROR",
    //         });
    //     } else
    //       console.error({
    //         message: "WEB2 Publish Error",
    //         error: "NOT 200 responee",
    //       });
    //   });
  } else {
    if (!isUsable(txHash))
      console.error({
        message: "The transaction to mint eBook failed.",
      });
    else
      console.error({
        message: `The transaction to mint eBook failed.\ntxhash: ${txHash}`,
      });
  }
};

const bookCoverGenerate = () => {};

export default booksAddServices;
