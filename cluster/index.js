const cluster = require('node:cluster')
const {availableParallelism} = require('node:os')

const CPUs = availableParallelism();
const numCPUsLength = CPUs;

function uncaughtExceptionHandler(err) {

  console.error("uncaughtException:", err.message);
  console.error(err.stack);

}

// Балансировка нагрузки между процессами. Воскрешаем воркер если завершился
function handleDeath(deadWorker) {

  console.log("worker " + deadWorker.process.pid + " dead");
  const worker = cluster.fork();
  console.log("re-spawning worker " + worker.process.pid);

}

function start(isMultiThreading, callable) {
  process.on("uncaughtException", uncaughtExceptionHandler);
  cluster.on("exit", handleDeath);
  console.log('start');

  // если у нас 1 ядро - нет необходимости форкать, запускаем сразу одним экземпляром
  if (!isMultiThreading || numCPUsLength === 1 || !cluster.isPrimary) return callable();

  // Сохраняем 1 поток ядра для главного процесса (1 главный + N инстансов)
  // или создаем 2 инстанса, 1 главный + 1 дочерний инстанс
  // это неэффективно при повторном запуске инстанса
  // если количество процессоров равно 2 - то лучше запустить 1 главный + 2 дочерних экземпляра экземпляра
  const instances = numCPUsLength > 2 ? numCPUsLength - 1 : numCPUsLength;

  console.log("Starting", instances, "instances");
  for (let i = 0; i < instances; i++, cluster.fork());
}

module.exports = start