ALTER TABLE `leads` ADD `has_whatsapp` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `leads` ADD `last_whatsapp_check` timestamp;