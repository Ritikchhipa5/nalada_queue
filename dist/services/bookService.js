"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const ethers_1 = require("ethers");
const functions_1 = require("../utils/functions");
const axios_1 = __importDefault(require("axios"));
const constant_1 = require("../utils/constant");
const bookDownload_1 = require("../utils/bookDownload");
const form_data_1 = __importDefault(require("form-data"));
const moment_1 = __importDefault(require("moment"));
const rabbitMq_1 = require("../jobs/rabbitMq");
const booksAddServices = async () => {
    const folders = await fs.promises.readdir(constant_1.dirPath);
    const readTempJson = await require(constant_1.tempJsonPath);
    let booksArray = [];
    let count = 0;
    for (const folder of folders) {
        if (fs?.lstatSync(`${constant_1.dirPath}/${folder}`).isDirectory() &&
            (0, functions_1.isUsable)(parseInt(folder))) {
            if (fs?.lstatSync(`${constant_1.dirPath}/${folder}/pg${folder}.json`)?.isFile() &&
                fs?.lstatSync(constant_1.tempJsonPath)?.isFile()) {
                let bookFile = null;
                try {
                    bookFile = require(`../data/epub/${folder}/pg${folder}.json`);
                }
                catch (error) {
                    console.error({
                        message: "Error opening JSON",
                        error: error,
                    });
                }
                if ((0, functions_1.isUsable)(bookFile)) {
                    count += 1;
                    booksArray.push(bookFile);
                    console.log(folders.length, count);
                    if (!(booksArray.length % 2) || count === folders.length) {
                        // await processToGetBooksInfo({ bookFiles: booksArray });
                        await fs.writeFileSync(constant_1.tempJsonPath, JSON.stringify({ bookReadCount: count }));
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
        bookshelf: typeof bookFile.RDF.ebook.bookshelf === "object"
            ? (0, functions_1.isUsable)(bookFile.RDF.ebook.bookshelf.length)
                ? bookFile.RDF.ebook.bookshelf.map((bookshelf) => bookshelf.Description.value)
                : [bookFile.RDF.ebook.bookshelf.Description.value]
            : [],
        creator: bookFile.RDF.ebook.creator?.agent?.name,
        description: bookFile.RDF.ebook.description,
        downloads: bookFile.RDF.ebook.downloads["#text"],
        covers: (0, functions_1.isUsable)(bookFile.RDF.ebook.hasFormat.length)
            ? bookFile.RDF.ebook.hasFormat
                .filter((format) => format.file["@_about"].includes("cover.medium")
                ? true
                : format.file["@_about"].includes("cover.small")
                    ? true
                    : false)
                .map((format) => format.file["@_about"])
            : bookFile.RDF.ebook.hasFormat.file["@_about"].includes("cover")
                ? bookFile.RDF.ebook.hasFormat.file["@_about"]
                : null,
        files: (0, functions_1.isUsable)(bookFile.RDF.ebook.hasFormat.length)
            ? bookFile.RDF.ebook.hasFormat
                .filter((format) => format.file["@_about"].includes("epub.noimages")
                ? true
                : format.file["@_about"].includes("epub3.images")
                    ? true
                    : format.file["@_about"].includes("epub.images")
                        ? true
                        : false)
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
    if ((0, functions_1.isFilled)(book.covers) && (0, functions_1.isFilled)(book.files)) {
        const coverUrl = book.covers[0];
        const fileUrl = book.files[1];
        const coverFileName = `${book.title.length > 64 ? book.title.slice(0, 64) : book.title}${coverUrl?.slice(coverUrl.lastIndexOf("."), coverUrl.length)}`;
        const bookFileName = `${book.title.length > 64 ? book.title.slice(0, 64) : book.title}.epub`;
        if ((0, functions_1.isUsable)(coverFileName) && (0, functions_1.isUsable)(bookFileName)) {
            await bookCoverDownload({ coverUrl, coverFileName });
            const downloadBook = await (0, bookDownload_1.bookDownload)({ fileUrl, bookFileName });
            if (downloadBook) {
                const readableStreamForBook = fs.createReadStream(`${constant_1.temPath}/${bookFileName}`);
                const readableStreamForCover = fs.createReadStream(`${constant_1.temPath}/${coverFileName}`);
                let formData = new form_data_1.default();
                formData.append("book", readableStreamForBook);
                formData.append("cover", readableStreamForCover);
                const submarineResponse = await axios_1.default.post(`${constant_1.NALNDA_SERVER_URL}/api/book/submarine`, formData, {
                    headers: {
                        "user-id": constant_1.UserState.user.uid,
                        address: constant_1.UserState.user.wallet,
                        authorization: `Bearer ${constant_1.UserState.tokens.acsTkn.tkn}`,
                        ...formData.getHeaders(),
                    },
                });
                if (submarineResponse.status === 200) {
                    const bookUrl = submarineResponse.data.book.url;
                    const coverUrl = submarineResponse.data.cover.url;
                    const secondaryFromInDays = Math.round(moment_1.default.duration((0, moment_1.default)().add(1, "days").diff((0, moment_1.default)())).asDays());
                    const price = "5";
                    console.log({ bookUrl });
                    console.log({ coverUrl });
                    console.log({ secondaryFromInDays });
                    if (!constant_1.LANGUAGES.includes(book.language)) {
                        constant_1.LANGUAGES.push(book.language);
                        fs.appendFile(constant_1.langPath, `"${book.language}",\n`, (err) => {
                            if (err)
                                console.error({
                                    message: "Language File Error",
                                    error: err,
                                    value: book.language,
                                });
                            else
                                console.log("Language added");
                        });
                    }
                    book.bookshelf.forEach((bookGenre) => {
                        if (!constant_1.GENRES.includes(bookGenre)) {
                            constant_1.GENRES.push(bookGenre);
                            fs.appendFile(constant_1.genresPath, `"${bookGenre}",\n`, (err) => {
                                if (err)
                                    console.error({
                                        message: "Genre File Error",
                                        error: err,
                                        value: bookGenre,
                                    });
                                else
                                    console.log("Genre added");
                            });
                        }
                    });
                    const language = book.language;
                    const genres = book.bookshelf;
                    console.log("starting txn");
                    // console.log(count, typeof count, count);
                    let transaction = await constant_1.marketplaceContract.createNewBook(constant_1.UserState.user.wallet, coverUrl, ethers_1.ethers.utils.parseEther(price), 
                    // secondaryFromInDays,
                    91, 
                    // LANGUAGES.indexOf(language),
                    1, 
                    // genres.map((genre) => GENRES.indexOf(genre))
                    [1, 2, 5]);
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
            bookshelf: typeof bookFile.RDF.ebook.bookshelf === "object"
                ? (0, functions_1.isUsable)(bookFile.RDF.ebook.bookshelf.length)
                    ? bookFile.RDF.ebook.bookshelf.map((bookshelf) => bookshelf.Description.value)
                    : [bookFile.RDF.ebook.bookshelf.Description.value]
                : [],
            creator: bookFile.RDF.ebook.creator?.agent?.name,
            description: bookFile.RDF.ebook.description,
            downloads: bookFile.RDF.ebook.downloads["#text"],
            covers: (0, functions_1.isUsable)(bookFile.RDF.ebook.hasFormat.length)
                ? bookFile.RDF.ebook.hasFormat
                    .filter((format) => format.file["@_about"].includes("cover.medium")
                    ? true
                    : format.file["@_about"].includes("cover.small")
                        ? true
                        : false)
                    .map((format) => format.file["@_about"])
                : bookFile.RDF.ebook.hasFormat.file["@_about"].includes("cover")
                    ? bookFile.RDF.ebook.hasFormat.file["@_about"]
                    : null,
            files: (0, functions_1.isUsable)(bookFile.RDF.ebook.hasFormat.length)
                ? bookFile.RDF.ebook.hasFormat
                    .filter((format) => format.file["@_about"].includes("epub.noimages")
                    ? true
                    : format.file["@_about"].includes("epub3.images")
                        ? true
                        : format.file["@_about"].includes("epub.images")
                            ? true
                            : false)
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
            if ((0, functions_1.isFilled)(book.covers) && (0, functions_1.isFilled)(book.files)) {
                const coverUrl = book.covers[0];
                const fileUrl = book.files[1];
                const coverFileName = `${book.title.length > 64 ? book.title.slice(0, 64) : book.title}${coverUrl?.slice(coverUrl.lastIndexOf("."), coverUrl.length)}`;
                const bookFileName = `${book.title.length > 64 ? book.title.slice(0, 64) : book.title}.epub`;
                if ((0, functions_1.isUsable)(coverFileName) && (0, functions_1.isUsable)(bookFileName)) {
                    await bookCoverDownload({ coverUrl, coverFileName });
                    const downloadBook = await (0, bookDownload_1.bookDownload)({ fileUrl, bookFileName });
                    if (downloadBook) {
                        const readableStreamForBook = fs.createReadStream(`${constant_1.temPath}/${bookFileName}`);
                        const readableStreamForCover = fs.createReadStream(`${constant_1.temPath}/${coverFileName}`);
                        let formData = new form_data_1.default();
                        formData.append("book", readableStreamForBook);
                        formData.append("cover", readableStreamForCover);
                        const submarineResponse = await axios_1.default.post(`${constant_1.NALNDA_SERVER_URL}/api/book/submarine`, formData, {
                            headers: {
                                "user-id": constant_1.UserState.user.uid,
                                address: constant_1.UserState.user.wallet,
                                authorization: `Bearer ${constant_1.UserState.tokens.acsTkn.tkn}`,
                                ...formData.getHeaders(),
                            },
                        });
                        if (submarineResponse.status === 200) {
                            const bookUrl = submarineResponse.data.book.url;
                            const coverUrl = submarineResponse.data.cover.url;
                            const secondaryFromInDays = Math.round(moment_1.default.duration((0, moment_1.default)().add(1, "days").diff((0, moment_1.default)())).asDays());
                            const price = "5";
                            console.log({ bookUrl });
                            console.log({ coverUrl });
                            console.log({ secondaryFromInDays });
                            if (!constant_1.LANGUAGES.includes(book.language)) {
                                constant_1.LANGUAGES.push(book.language);
                                fs.appendFile(constant_1.langPath, `"${book.language}",\n`, (err) => {
                                    if (err)
                                        console.error({
                                            message: "Language File Error",
                                            error: err,
                                            value: book.language,
                                        });
                                    else
                                        console.log("Language added");
                                });
                            }
                            book.bookshelf.forEach((bookGenre) => {
                                if (!constant_1.GENRES.includes(bookGenre)) {
                                    constant_1.GENRES.push(bookGenre);
                                    fs.appendFile(constant_1.genresPath, `"${bookGenre}",\n`, (err) => {
                                        if (err)
                                            console.error({
                                                message: "Genre File Error",
                                                error: err,
                                                value: bookGenre,
                                            });
                                        else
                                            console.log("Genre added");
                                    });
                                }
                            });
                            const language = book.language;
                            const genres = book.bookshelf;
                            console.log("starting txn");
                            books._author.push(constant_1.UserState.user.wallet);
                            books._coverURI.push(coverUrl);
                            books._initialPrice.push(ethers_1.ethers.utils.parseEther(price));
                            books._daysForSecondarySales.push(91);
                            books._lang.push(1);
                            books._genre.push([1, 2, 5]);
                            // console.log(count, typeof count, count);
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error("Genre File Error", error);
        }
    }
    let transaction = await constant_1.marketplaceContract.createNewBooks(books._author, books._coverURI, books._initialPrice, books._daysForSecondarySales, books._lang, books._genre);
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
        const response = await (0, axios_1.default)({
            url: coverUrl,
            method: "GET",
            responseType: "stream",
        });
        const coverDownload = fs.createWriteStream(`${constant_1.temPath}/${coverFileName}`);
        response.data.pipe(coverDownload);
        return new Promise((resolve, reject) => {
            coverDownload.on("finish", resolve);
            coverDownload.on("error", reject);
        });
    }
    catch (error) { }
};
// Book upload in the database
const bookUploadToDatabase = async ({ book, tx, bookFileName, coverUrl, coverFileName, bookUrl, genres, price, language, secondaryFromInDays, }) => {
    const bookAddress = tx.events.filter((event) => event["event"] === "OwnershipTransferred")[0].address;
    const status = tx.status;
    const txHash = tx.transactionHash;
    console.log({ creator: book.creator });
    if ((0, functions_1.isUsable)(bookAddress) &&
        (0, functions_1.isUsable)(status) &&
        status === 1 &&
        (0, functions_1.isUsable)(txHash)) {
        let formData = new form_data_1.default();
        formData.append("epub", fs.createReadStream((0, constant_1.customPath)(`../temp/${bookFileName}`)));
        formData.append("name", book?.title ?? "UNKNOWN");
        formData.append("author", book?.creator ?? "UNKNOWN");
        formData.append("cover", coverUrl);
        formData.append("coverFile", fs.createReadStream(`./temp/${coverFileName}`));
        formData.append("book", bookUrl);
        formData.append("genres", JSON.stringify(genres));
        formData.append("ageGroup", JSON.stringify([]));
        formData.append("price", price);
        formData.append("pages", 500);
        formData.append("publication", book?.publisher ?? "UNKNOWN");
        formData.append("synopsis", 
        // synopsis.replace(/<[^>]+>/g,'')
        "");
        formData.append("language", language);
        formData.append("published", (0, moment_1.default)().format("YYYY-MM-DD"));
        formData.append("secondarySalesFrom", secondaryFromInDays);
        formData.append("publisherAddress", constant_1.UserState.user.wallet);
        formData.append("bookAddress", bookAddress);
        formData.append("txHash", txHash);
        rabbitMq_1.rabbitMqClient.sendCreateBookTransactionDataToQueue(constant_1.QUEUES.BOOK_BATCH_PROCESSING_QUEUE, JSON.stringify({
            formData,
        }));
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
    }
    else {
        if (!(0, functions_1.isUsable)(txHash))
            console.error({
                message: "The transaction to mint eBook failed.",
            });
        else
            console.error({
                message: `The transaction to mint eBook failed.\ntxhash: ${txHash}`,
            });
    }
};
const bookCoverGenerate = () => { };
exports.default = booksAddServices;
