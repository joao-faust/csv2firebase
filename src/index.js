import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import loadash from 'lodash';
import { stdin as input, stdout as output } from 'node:process';

import consola from 'consola';
import csv2json from 'csvtojson';

import { addDoc, collection } from 'firebase/firestore';
import { firestoreRef } from './config/firebase.js';

/**
 * @param {string} baseDirectory 
 */
const getCsvPaths = async (directoryPath) => {
  try {
    await fs.access(directoryPath);
    const csvPaths = await fs.readdir(directoryPath);
    return csvPaths.map((csvPath) => path.join(`${directoryPath}/${csvPath}`));
  } catch {
    return null;
  }
}

/**
 * @param {string[]} keys 
 * @param {any[]} values 
 */
const buildDocumentData = (keys, values) => {
  const data = {};
  keys.forEach((key, index) => data[key] = values[index]);
  return data;
}

(async () => {
  const rl = readline.createInterface({ input, output });
  const rawCsvDirectoryPath = await rl.question('Caminho da pasta com os CSVs: ');
  const csvDirectory = rawCsvDirectoryPath.trim();
  rl.close();

  if (!csvDirectory) {
    consola.error('Nenhum caminho informado.');
    return;
  }

  const csvPaths = await getCsvPaths(csvDirectory);

  if (!csvPaths) {
    consola.error('Diretório não encontrado.');
    return;
  }

  csvPaths.forEach(async (csvPath) => {
    const csvData = await csv2json().fromFile(csvPath);
    const { name: rawCollectionName } = path.parse(csvPath);

    const collectionName = loadash
      .camelCase(loadash.deburr(rawCollectionName))
      .trim();

    if (csvData.length < 1) {
      consola.error(`Não foi possivel criar a coleção "${collectionName}".`);
      return;
    }

    const rawCsvColumns = Object.keys(csvData.at(0));
    
    const csvColumns = rawCsvColumns.map((csvColumn) => {
      return loadash
        .camelCase(loadash.deburr(csvColumn))
        .trim();
    }); 

    let documentsCount = 0;

    for (const csvRow of csvData) {
      const csvRowValues = Object.values(csvRow);
      const documentData = buildDocumentData(csvColumns, csvRowValues);
      const collectionRef = collection(firestoreRef, collectionName);
      await addDoc(collectionRef, documentData);
      documentsCount++;
    }

    consola.success(`${documentsCount} documento(s) enviado(s) para a coleção ${collectionName}.`);
  });
})();
