generate:
	. ${NVM_DIR}/nvm.sh && nvm exec yarn generate

copy-waha: generate
	rm -rf  ../../whatsapp-http-api/dist/dashboard/*
	cp -Rv .output/public/* ../../whatsapp-http-api/dist/dashboard/
