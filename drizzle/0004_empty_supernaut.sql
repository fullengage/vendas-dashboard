CREATE TABLE `import_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(255) NOT NULL,
	`file_hash` varchar(64) NOT NULL,
	`status` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`total_rows` int DEFAULT 0,
	`success_rows` int DEFAULT 0,
	`error_rows` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `import_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `import_batches_file_hash_unique` UNIQUE(`file_hash`)
);
--> statement-breakpoint
CREATE TABLE `import_errors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batch_id` int NOT NULL,
	`row_number` int NOT NULL,
	`error_message` text,
	`raw_row_json` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `import_errors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`cod_prod` varchar(20) NOT NULL,
	`desc_saida` varchar(255) NOT NULL,
	`unidade` varchar(10),
	`qtde` decimal(12,2) DEFAULT '0',
	`valor_unit` decimal(12,2) DEFAULT '0',
	`total_item` decimal(15,2) DEFAULT '0',
	`desconto` decimal(15,2) DEFAULT '0',
	`lote` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_order_prod_lote` UNIQUE(`order_id`,`cod_prod`,`lote`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cod_pedido` varchar(20) NOT NULL,
	`cod_pessoa` varchar(20) NOT NULL,
	`cod_usuario` varchar(20),
	`cod_equipe` varchar(20),
	`dta_emissao` varchar(10) NOT NULL,
	`dta_entrega` varchar(10),
	`dta_faturamento` varchar(10),
	`valor_total` decimal(15,2) DEFAULT '0',
	`desconto` decimal(15,2) DEFAULT '0',
	`valor_final` decimal(15,2) DEFAULT '0',
	`situacao` varchar(50),
	`desc_sit` varchar(100),
	`cod_status` varchar(20),
	`forma_pagto` varchar(50),
	`obs` text,
	`import_batch_id` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_cod_pedido_unique` UNIQUE(`cod_pedido`)
);
