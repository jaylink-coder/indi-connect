-- CreateIndex
CREATE UNIQUE INDEX "Archdiocese_name_headquartersId_key" ON "Archdiocese"("name", "headquartersId");

-- CreateIndex
CREATE UNIQUE INDEX "Diocese_name_archidId_key" ON "Diocese"("name", "archidId");

-- CreateIndex
CREATE UNIQUE INDEX "Parish_name_dioceseId_key" ON "Parish"("name", "dioceseId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalChurch_name_parishId_key" ON "LocalChurch"("name", "parishId");
