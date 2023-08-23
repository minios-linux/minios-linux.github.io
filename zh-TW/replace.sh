#!/bin/bash

replace() {
    local DISTRO DESKTOP_ENVIRONMENT PACKAGE_VARIANT LANGUAGE DISTRIBUTION_ARCH COMP_TYPE

    if [ $# -ne 6 ]; then
        echo "Usage: $0 DISTRO DESKTOP_ENVIRONMENT PACKAGE_VARIANT LANGUAGE DISTRIBUTION_ARCH COMP_TYPE"
        exit 1
    fi

    # Default values
    DISTRO=$1
    DESKTOP_ENVIRONMENT=$2
    PACKAGE_VARIANT=$3
    LANGUAGE=$4
    DISTRIBUTION_ARCH=$5
    COMP_TYPE=$6

    # Modify string and update files
    ORIGINAL_STRING=$(grep "minios-DISTRO-DESKTOP_ENVIRONMENT-PACKAGE_VARIANT-LANGUAGE-lkm-aufs-DISTRIBUTION_ARCH-COMP_TYPE" download-template.html)
    NEW_STRING=$(echo "${ORIGINAL_STRING}" | sed -e "s/DISTRO/$DISTRO/g" -e "s/DESKTOP_ENVIRONMENT/$DESKTOP_ENVIRONMENT/g" -e "s/PACKAGE_VARIANT/$PACKAGE_VARIANT/g" -e "s/LANGUAGE/$LANGUAGE/g" -e "s/DISTRIBUTION_ARCH/$DISTRIBUTION_ARCH/g" -e "s/COMP_TYPE/$COMP_TYPE/g")
    cp download-template.html download-"$DESKTOP_ENVIRONMENT"-"$PACKAGE_VARIANT"-"$DISTRIBUTION_ARCH".html
    sed -i "s#${ORIGINAL_STRING}#${NEW_STRING}#" download-"$DESKTOP_ENVIRONMENT"-"$PACKAGE_VARIANT"-"$DISTRIBUTION_ARCH".html

    # Output chosen parameters
    echo "File download-$DESKTOP_ENVIRONMENT-$PACKAGE_VARIANT-$DISTRIBUTION_ARCH.html has been created."
}

replace buster xfce minimum en i386 xz
replace buster xfce minimum en amd64 xz
replace bookworm flux minimum en i386 xz
replace bookworm flux minimum en amd64 xz
replace bookworm xfce standard en i386 zstd
replace bookworm xfce standard en amd64 zstd
replace bookworm xfce maximum en amd64 zstd
replace bookworm xfce ultra en amd64 zstd
replace bookworm xfce puzzle-base en amd64 zstd
replace bookworm xfce puzzle en amd64 zstd

