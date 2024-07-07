import * as fs from "fs";
import { ethers } from "ethers";
import { isFilled, isUsable } from "../utils/functions";
import axios from "axios";
import {
  BOOKS_PROCESS,
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
  tempJsonPath,
  UserState,
} from "../utils/constant";
import { bookDownload } from "../utils/bookDownload";
import FormData from "form-data";
import moment from "moment";
import { rabbitMqClient } from "../jobs/rabbitMq";

const booksAddServices = async () => {
  const folders = await fs.promises.readdir(dirPath);
  const readTempJson = await require(tempJsonPath);
  let booksArray = [];
  let count = 0;

  for (const folder of folders) {
    if (
      fs?.lstatSync(`${dirPath}/${folder}`).isDirectory() &&
      isUsable(parseInt(folder))
    ) {
      if (
        fs?.lstatSync(`${dirPath}/${folder}/pg${folder}.json`)?.isFile() &&
        fs?.lstatSync(tempJsonPath)?.isFile()
      ) {
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
          console.log(folders.length > count);
          try {
            if (
              !(booksArray.length % BOOKS_PROCESS) ||
              count === folders.length
            ) {
              await processToGetBooksInfo({ bookFiles: booksArray });
              // fs.writeFileSync(
              //   tempJsonPath,
              //   JSON?.stringify({ bookReadCount: count })
              // );
              // console.log(booksArray);

              booksArray = [];
            }
          } catch (error) {
            console.log(error);
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
          await bookUploadToQueue({
            book: book,
            tx: tx,
            bookAddress: "",
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
  const booksInfos = [];
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
              books._initialPrice.push(ethers.utils.parseUnits(price, 6));
              books._daysForSecondarySales.push(91);
              books._lang.push(1);
              books._genre.push([1, 2, 5]);
              // console.log(count, typeof count, count);

              booksInfos.push({
                book: book,
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
    } catch (error) {
      console.error("Genre File Error", error);
    }
  }

  let booksAddresses = await marketplaceContract.computeNextBooksAddresses(
    books._author,
    books._coverURI,
    books._initialPrice,
    books._daysForSecondarySales,
    books._lang,
    books._genre
  );
  console.log(booksAddresses);
  let transaction = await marketplaceContract.createNewBooks(
    books._author,
    books._coverURI,
    books._initialPrice,
    books._daysForSecondarySales,
    books._lang,
    books._genre
  );

  let tx = await transaction.wait();

  // console.log(booksAddresses, "booksAddresses");
  console.log({ tx });
  for (let index = 0; index < booksAddresses.length; index++) {
    const bookAddress = booksAddresses[index];
    await bookUploadToQueue({
      book: booksInfos[index]?.book,
      tx: tx,
      bookAddress: bookAddress,
      bookFileName: booksInfos[index]?.bookFileName,
      coverUrl: booksInfos[index]?.coverUrl,
      coverFileName: booksInfos[index]?.coverFileName,
      bookUrl: booksInfos[index]?.bookUrl,
      genres: booksInfos[index]?.genres,
      price: booksInfos[index]?.price,
      language: booksInfos[index]?.language,
      secondaryFromInDays: booksInfos[index]?.secondaryFromInDays,
    });
  }
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
export const bookUploadToDatabase = async ({
  epub,
  name,
  author,
  cover,
  coverFile,
  book,
  genres,
  ageGroup,
  price,
  pages,
  publication,
  synopsis,
  language,
  published,
  secondarySalesFrom,
  publisherAddress,
  bookAddress,
  txHash,
}: any) => {
  try {
    let formData = new FormData();
    formData.append("epub", fs.createReadStream(String(epub?.path)));
    formData.append("name", name ?? "UNKNOWN");
    formData.append("author", author ?? "UNKNOWN");
    formData.append("cover", cover);
    formData.append("coverFile", fs.createReadStream(String(coverFile?.path)));
    formData.append("book", book);
    formData.append("genres", genres);
    formData.append("ageGroup", ageGroup);
    formData.append("price", price);
    formData.append("pages", pages);
    formData.append("publication", publication ?? "UNKNOWN");
    formData.append(
      "synopsis",
      // synopsis.replace(/<[^>]+>/g,'')
      synopsis
    );
    formData.append("language", language);
    formData.append("published", published);
    formData.append("secondarySalesFrom", secondarySalesFrom);
    formData.append("publisherAddress", publisherAddress);
    formData.append("bookAddress", bookAddress);
    formData.append("txHash", txHash);

    await axios({
      url: NALNDA_SERVER_URL + "/api/book/publish",
      method: "POST",
      headers: {
        ...formData.getHeaders(),
      },
      data: formData,
    })
      .then((res4) => {
        console.log(res4?.status);
        if (res4.status === 200) {
          console.log({
            message: "book published",
            book: {
              title: name,
              address: bookAddress,
              txnHash: txHash,
            },
          });
        } else {
          console.error({
            message: "WEB2 Publish Error",
          });
        }
      })
      .catch((err) => {
        console.log(err?.response?.status);
        if (isUsable(err.response)) {
          if (err.response.status === 413)
            console.error({
              message: "WEB2 Publish Error",
              error: "FILE LIMIT ERROR",
            });
          else if (err.response.status === 415)
            console.error({
              message: "WEB2 Publish Error",
              error: "INVALID FILE TYPE ERROR",
            });
          else if (err.response.status === 500)
            console.error({
              message: "WEB2 Publish Error",
              error: "INTERNAL SERVER ERROR",
            });
        } else
          console.error({
            message: "WEB2 Publish Error",
            error: "NOT 200 responee",
          });
      });
  } catch (error) {
    console.error(error);
  }
};

const bookUploadToQueue = async ({
  book,
  tx,
  bookAddress,
  bookFileName,
  coverUrl,
  coverFileName,
  bookUrl,
  genres,
  price,
  language,
  secondaryFromInDays,
}) => {
  // const bookAddress = tx.events.filter(
  //   (event) => event["event"] === "OwnershipTransferred"
  // )[0].address;
  const status = tx.status;
  const txHash = tx.transactionHash;

  if (
    isUsable(bookAddress) &&
    isUsable(status) &&
    status === 1 &&
    isUsable(txHash)
  ) {
    const bookData = {
      epub: fs.createReadStream(customPath(`../temp/${bookFileName}`)),
      name: book?.title ?? "UNKNOWN",
      author: book?.creator ?? "UNKNOWN",
      cover: coverUrl,
      coverFile: fs.createReadStream(customPath(`../temp/${coverFileName}`)),
      book: bookUrl,
      genres: JSON.stringify(genres),
      ageGroup: JSON.stringify([]),
      price: price,
      pages: 500,
      publication: book?.publisher ?? "UNKNOWN",
      synopsis: "",
      language: language,
      published: moment().format("YYYY-MM-DD"),
      secondarySalesFrom: secondaryFromInDays,
      publisherAddress: UserState.user.wallet,
      bookAddress: bookAddress,
      txHash: txHash,
    };

    rabbitMqClient.sendCreateBookTransactionDataToQueue(
      QUEUES.BOOK_BATCH_PROCESSING_QUEUE,
      JSON.stringify(bookData)
    );
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
