import axios from "axios";
import { isUsable } from "./functions";
import { createWriteStream } from "fs";
import { temPath } from "./constant";

export const bookDownload = async ({ fileUrl, bookFileName }) => {
  console.log(fileUrl);
  if (isUsable(fileUrl)) {
    try {
      const response = await axios({
        url: fileUrl,
        method: "GET",
        responseType: "stream",
      });

      const bookDownload = createWriteStream(`${temPath}/${bookFileName}`);
      response.data.pipe(bookDownload);

      return new Promise((resolve, reject) => {
        bookDownload.on("finish", () => {
          console.log("Download complete");
          resolve(true);
        });
        bookDownload.on("error", (err) => {
          console.error("Error writing file:", err.message);
          reject(err);
        });
      });
    } catch (err) {
      console.error("Error downloading the book:", err);
      return Promise.reject(err);
    }
  } else {
    return null;
  }
};
